# Product feedback

Open **Feedback** from the sidebar or command palette. You can also select **Send feedback** under
**Settings > General > About**. Desktop builds include **Help > Send Feedback**.

Write up to 4,000 characters and select **Send**. Select **Choose an element** to attach a safe
description of one interface element.

## What Isnadi sends

A submission contains the feedback text and, when selected, one interface element descriptor. It
does not contain a screenshot, raw page content, input value, credential, tool result, workspace
path, full URL, open chat, or conversation history.

A failed send keeps the draft. A confirmed send clears it. No account is required. The feedback
Worker keeps accepted feedback for up to 90 days and can post it publicly to the GitHub Issues tab
of the repository its operator configures.
Do not include secrets or private data. A GitHub issue remains until a maintainer removes it.

IsnadiBot has no hosted feedback service. Sending works only after an operator deploys the
feedback Worker in `infra/feedback` and sets its HTTPS URL under
**Settings > Advanced > Feedback endpoint**; until then **Send** stays disabled. Loopback HTTP is
allowed for local testing. Turn off **Product feedback** under **Settings > Privacy & data** to
disable sending.

## Bot-proposed feedback

A Codex-backed Isnadi bot can propose text for the same feedback draft after one-time approval. The
bot cannot submit it. Review the draft and select **Send** yourself.

Web and desktop can open the proposed draft. Mobile can decline the approval but cannot open the
draft in this version.
