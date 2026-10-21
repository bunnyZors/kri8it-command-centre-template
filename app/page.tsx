import { requireChatGPTUser, chatGPTSignOutPath } from "@/app/chatgpt-auth";
import { Board } from "@/components/board";
import { loadBoardData } from "@/lib/task-data";
import { BOARD_OWNER_ID } from "@/lib/board-scope";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");
  const boardData = await loadBoardData(BOARD_OWNER_ID);

  return (
    <Board
      initialData={boardData}
      displayName={user.fullName ?? user.email.split("@")[0]}
      email={user.email}
      signOutPath={chatGPTSignOutPath("/")}
    />
  );
}
