# Phone performance profile

Use this protocol before setting frame-time budgets, prefetch thresholds or
adding worker/atlas complexity. Browser device emulation is useful for layout
checks but does not count as a physical-device result.

## Devices and build

Profile at least one lower or mid-range phone and one representative newer
phone from the supported platforms. Use the same private build and record:

- commit and private build/runtime version
- device model, OS version, browser and refresh rate
- viewport size, pixel ratio, network type and battery-saver state
- whether the run is cold (fresh page/cache) or warm

Do not compare runs with different builds or different screen refresh rates as
though they were the same test.

## Scenarios

Run each scenario three times, noting cold or warm state:

1. Cold launch into the shop; wait for the creature and visible item art.
2. Open equipment inspection and a full satchel; page through the long item
   description and return to the shop.
3. Open surgery with a many-limb build; switch between current and proposed
   anatomy and inspect the projected changes.
4. Run a 60-second arena fight with a dense anatomy build and several enemies;
   include ordinary movement, attacks, status effects and the result screen.
5. Background the app during combat, then return and verify that animation and
   input recover without a burst of queued frames.

Use the same saved build and encounter for every device. Include both portrait
and landscape only where the game supports that orientation.

## Record

Capture a browser performance trace for each scenario and record:

- median and 95th-percentile frame interval while the screen is active
- frames longer than 50 ms and the busiest scene/action around each spike
- long JavaScript tasks and the largest observed heap after repeated scene use
- cold and warm time until visible art is ready
- any missing assets, visible fallback frames, input delay or recovery issue

Use Chrome remote inspection for Android Chrome or Safari Web Inspector for
iOS Safari. Keep the trace and notes with the device/build metadata. Do not set
pass/fail budgets or tune prefetch thresholds until the first representative
measurements exist; use later runs to compare changes on the same device.
