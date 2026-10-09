# FRANKENTOWER — private reliability playtest

Patient records are validated before the game starts. Damaged records offer an explicit reset confirmation, while incompatible development rulesets still reset without migration.

Failed saves retain the newest pending progress and retry automatically with bounded backoff. Manual retry and host resume also retry pending writes. Engine failures return to the shop without recording a defeat; runtime crashes offer reconnection to saved records.

Browser checks now run across platforms and include corrupted saves, write failures, interrupted combat, and rendering/asynchronous crashes. Donor grafts use their own torso silhouettes, and arena drawing safely stops when its canvas is removed.

This build remains private/unlisted. It is not a public release or jam submission.
