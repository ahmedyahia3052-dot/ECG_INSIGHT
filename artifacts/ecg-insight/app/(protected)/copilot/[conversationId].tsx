import { useLocalSearchParams } from "expo-router";

import { CopilotWorkspaceScreen } from "../copilot";

export default function CopilotConversationRoute() {
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  return <CopilotWorkspaceScreen routeConversationId={conversationId} />;
}
