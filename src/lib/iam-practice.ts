import {
  AttachGroupPolicyCommand,
  CreateGroupCommand,
  CreatePolicyCommand,
  CreateUserCommand,
  DeleteUserCommand,
  GetGroupCommand,
  ListGroupsForUserCommand,
  ListUsersCommand,
  RemoveUserFromGroupCommand,
  SimulatePrincipalPolicyCommand,
  type PolicySimulationDecisionType,
  AddUserToGroupCommand,
} from "@aws-sdk/client-iam";

import { iam } from "@/lib/aws";

export const ACCOUNT_ID = "000000000000";

export const TIER_NAMES = ["Admins", "Developers", "Viewers"] as const;

export type TierName = (typeof TIER_NAMES)[number];

export const TIER_POLICIES: Record<TierName, string> = {
  Admins: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{ Effect: "Allow", Action: "*", Resource: "*" }],
  }),
  Developers: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["s3:ListAllMyBuckets", "s3:CreateBucket", "s3:ListBucket"],
        Resource: ["arn:aws:s3:::*"],
      },
      {
        Effect: "Allow",
        Action: ["s3:GetObject", "s3:PutObject"],
        Resource: ["arn:aws:s3:::*/*"],
      },
    ],
  }),
  Viewers: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["s3:ListAllMyBuckets", "s3:ListBucket", "s3:GetObject"],
        Resource: ["arn:aws:s3:::*", "arn:aws:s3:::*/*"],
      },
      {
        Effect: "Deny",
        Action: ["s3:CreateBucket", "s3:PutObject", "s3:DeleteObject"],
        Resource: "*",
      },
    ],
  }),
};

export const policyArnForGroup = (groupName: TierName) =>
  `arn:aws:iam::${ACCOUNT_ID}:policy/${groupName}Policy`;

export const userArn = (userName: string) =>
  `arn:aws:iam::${ACCOUNT_ID}:user/${userName}`;

export async function ensureGroupWithPolicy(groupName: TierName) {
  await iam.send(new CreateGroupCommand({ GroupName: groupName })).catch(() => {
    return undefined;
  });

  await iam
    .send(
      new CreatePolicyCommand({
        PolicyName: `${groupName}Policy`,
        PolicyDocument: TIER_POLICIES[groupName],
      }),
    )
    .catch(() => {
      return undefined;
    });

  await iam.send(
    new AttachGroupPolicyCommand({
      GroupName: groupName,
      PolicyArn: policyArnForGroup(groupName),
    }),
  );
}

export async function listUsersWithGroups() {
  const out = await iam.send(new ListUsersCommand({}));
  const users = out.Users ?? [];

  const enriched = await Promise.all(
    users.map(async (user) => {
      const userName = user.UserName ?? "";
      if (!userName) {
        return null;
      }

      const groups = await iam.send(
        new ListGroupsForUserCommand({ UserName: userName }),
      );

      return {
        name: userName,
        arn: user.Arn,
        groups: (groups.Groups ?? []).map((group) => group.GroupName).filter(Boolean),
      };
    }),
  );

  return enriched.filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function addUserToSingleGroup(userName: string, groupName: TierName) {
  await iam.send(new CreateUserCommand({ UserName: userName })).catch(() => {
    return undefined;
  });

  const current = await iam.send(new ListGroupsForUserCommand({ UserName: userName }));

  for (const group of current.Groups ?? []) {
    if (group.GroupName && group.GroupName !== groupName) {
      await iam.send(
        new RemoveUserFromGroupCommand({
          UserName: userName,
          GroupName: group.GroupName,
        }),
      );
    }
  }

  await iam.send(
    new AddUserToGroupCommand({
      UserName: userName,
      GroupName: groupName,
    }),
  );
}

export async function deleteUserAndMemberships(userName: string) {
  const groups = await iam.send(new ListGroupsForUserCommand({ UserName: userName }));

  for (const group of groups.Groups ?? []) {
    if (group.GroupName) {
      await iam.send(
        new RemoveUserFromGroupCommand({
          UserName: userName,
          GroupName: group.GroupName,
        }),
      );
    }
  }

  await iam.send(new DeleteUserCommand({ UserName: userName }));
}

export async function listGroups() {
  const data = await Promise.all(
    TIER_NAMES.map(async (groupName) => {
      const group = await iam
        .send(new GetGroupCommand({ GroupName: groupName }))
        .catch(() => undefined);

      return {
        name: groupName,
        users: (group?.Users ?? []).map((user) => user.UserName).filter(Boolean),
      };
    }),
  );

  return data;
}

export type SimulateResult = {
  decision: PolicySimulationDecisionType | "unknown";
  action: string;
  resource: string;
};

export async function simulateUserAction(input: {
  userName: string;
  action: string;
  resourceArn: string;
}): Promise<SimulateResult> {
  const out = await iam.send(
    new SimulatePrincipalPolicyCommand({
      PolicySourceArn: userArn(input.userName),
      ActionNames: [input.action],
      ResourceArns: [input.resourceArn],
    }),
  );

  const first = out.EvaluationResults?.[0];

  return {
    decision: first?.EvalDecision ?? "unknown",
    action: input.action,
    resource: input.resourceArn,
  };
}
