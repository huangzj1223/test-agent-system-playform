"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { ChatContainer } from "@/components/chat/chat-container";
import { MainLayout } from "@/components/layout";

export default function ChatPage() {
  return (
    <RequireAuth>
      <MainLayout title="智能体对话">
        <ChatContainer />
      </MainLayout>
    </RequireAuth>
  );
}
