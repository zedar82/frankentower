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

## First physical-device baseline — 14 October 2026

This is an initial baseline, not full release validation. It uses the current
code at `9ea754d`, built with `npm run build` and served locally through Vite
preview at `127.0.0.1:4173`. It is not the hosted run.world build. The browser
reported the RUN cloud-save state; the test advanced a development patient to
Floor 2.

**Device and conditions:** Motorola Edge 50 Neo, Android 16 (API 36), Chrome
155.0.8059.39. The panel supports up to 120 Hz; SurfaceFlinger reported an
active 90 Hz mode for the landscape samples. Battery saver was off, the phone
was charging at 82–84%, and Wi-Fi was connected. The device reports 1200×2670
portrait pixels, DPR 1.5. Chrome's portrait viewport was 502×1012 CSS pixels;
in landscape it was 1068×418 CSS pixels.

**Cold shop launch:** three cache-cleared reloads into the Floor 1 shop, with
one requestAnimationFrame and Long Task observer and no tracing. Portrait
frame intervals were 16.4 ms median, 16.6–16.7 ms at p95, and zero over 50 ms
in every run. Each run recorded zero Long Tasks. The largest interval was
41–49 ms. The `load` event completed in 95–117 ms; image-initiated resource
requests finished by 606–610 ms. The game paints those assets into canvas, so
this is the last image response time, not a direct measure of the first fully
composed visible-art frame.

**Warm shop:** a separate six-second portrait sample measured 16.4 ms median
and 16.5 ms p95, with no intervals over 50 ms or Long Tasks. Three six-second
landscape samples measured 21.9 ms median and 22.0 ms p95, with no intervals
over 50 ms or Long Tasks. The landscape shop's document height equalled the
viewport height, so it did not scroll. Keep the 45.5 fps landscape cadence as
a follow-up observation against the active 90 Hz display mode; do not turn it
into a pass/fail budget from this one phone.

A qualitative landscape shop trace and its metadata are stored in
[`performance-profiles/2026-10-14-moto-edge-50-neo/`](performance-profiles/2026-10-14-moto-edge-50-neo/).
Android `dumpsys gfxinfo` returned zero frames for Chrome's view root, so its
frame histogram was discarded; the reported intervals come from the page's
requestAnimationFrame timestamps.

**Background and return:** on a fresh Floor 1 fight, the page became hidden
when Chrome was backgrounded. Player HP did not change during the observed
hidden interval. On return, the browser resumed at its normal frame cadence
and the combat pause control responded. The first attempt opened an extra tab
and was discarded; the counted attempt used one tab and reopened Chrome's
existing activity.

**Stress scenarios still open:** the first-run patient had one starter weapon
and no added anatomy. It died on Floor 3 during the attempted 60-second arena
run, leaving most of the capture interval on the result screen. No full
satchel, multi-limb surgery build, or sustained dense fight was available, and
there was only one phone. Those scenarios and a comparison device remain
necessary before setting performance budgets. Repeat against the same
prepared development build on a representative newer phone; preserve the
landscape shop observation as a target for follow-up profiling.
