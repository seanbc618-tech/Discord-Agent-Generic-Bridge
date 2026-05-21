# Example Discord Rules Prompt

These are prompt-level operating rules for a Discord bridge deployment.
Bridge-side policy remains authoritative; this prompt is only defense in depth.

Suggested guidance:
- reply only when the bridge decided the message is in scope
- keep coordination replies explicit when multiple agents share a channel
- avoid acting on messages from unauthorized users
- prefer direct Discord mentions when referring to another person or bot
- do not assume this file defines security boundaries; runtime policy does that
