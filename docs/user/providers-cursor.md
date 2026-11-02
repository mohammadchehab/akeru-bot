# Cursor

Isnadi can run a bot on Cursor through the Cursor command-line tool. You sign in with your own Cursor
account, and Cursor bills your own Cursor plan per token. Isnadi stores no Cursor credential.

Cursor is off until you turn it on in **Settings > Providers > Cursor**.

## Set up

1. Install the Cursor CLI (`agent`) on the machine that runs your Isnadi environment.
2. Open **Settings > Providers > Cursor**.
3. Under **Account**, select **Sign in with Cursor**, then **Open sign-in page**. The page opens on
   the device you are using, even when the environment runs on another machine.
4. Approve access in the browser. The Account row shows your email once Cursor confirms.
5. Turn on the Cursor instance, then choose a Cursor model in a bot's settings.

If the sign-in page cannot be shown, run `agent login` on the environment's machine and refresh.
**Sign out** runs `agent logout` there. The model list comes from your Cursor account. **Auto** lets
Cursor choose and is always available.

## Read-only by default

A Cursor bot reads and answers; it does not edit files or run commands. Choose **Full access** for a
chat when you want Cursor to act. Full access lets Cursor edit files and run commands **without
asking**, so use it only in a project you trust. Cursor has no per-action approval, so the other modes
behave as read-only.

## What to expect

- Cursor runs on the environment's own machine, so it works only with the **Local** sandbox. Choose
  Local in the bot's settings; a cloud sandbox is refused when the chat starts.
- Attachments are not supported yet.
- Cursor handles one turn at a time. **Stop** ends the turn and keeps the conversation, so the next
  message continues it.
- Isnadi's own tools are limited for Cursor bots and are not available yet.
- Group chats treat a Cursor bot like standard OpenCode: no group-specific features.
- Cursor cannot roll back its own edits. Isnadi's checkpoints still record each turn.
- Usage appears under **Cursor** on the Usage page, counted from the tokens Cursor reports.
