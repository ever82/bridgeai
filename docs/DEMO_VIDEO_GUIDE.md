# Demo Video Recording Guide

This guide describes how to prepare, record, and post-produce demo videos for each BridgeAI core scenario.

## Directory Structure

```
docs/demo-videos/          # 录制脚本、分镜和后期制作笔记
assets/demo-recordings/    # 原始录制文件和最终成品视频
docs/demo-scripts/         # 各场景的详细操作脚本
```

## Core Scenarios

The following four scenarios must be recorded for each release:

| #   | Scenario                       | Script                                         | Recording Account          | Target Duration |
| --- | ------------------------------ | ---------------------------------------------- | -------------------------- | --------------- |
| 1   | AgentAd - AI ad matching       | `docs/demo-scripts/DEMO_SCRIPT_AGENTAD.md`     | `demo-ad@bridgeai.com`     | 3-5 min         |
| 2   | AgentDate - AI dating matching | `docs/demo-scripts/DEMO_SCRIPT_AGENTDATE.md`   | `demo-date@bridgeai.com`   | 4-6 min         |
| 3   | AgentJob - AI job matching     | `docs/demo-scripts/DEMO_SCRIPT_AGENTJOB.md`    | `demo-job@bridgeai.com`    | 4-6 min         |
| 4   | VisionShare - visual sharing   | `docs/demo-scripts/DEMO_SCRIPT_VISIONSHARE.md` | `demo-vision@bridgeai.com` | 3-5 min         |

## Recording Equipment & Setup

### Desktop Recording

1. **macOS**: Use QuickTime Player > File > New Screen Recording, or OBS Studio.
2. **Windows**: Use Xbox Game Bar (`Win+G`) or OBS Studio.
3. Recommended resolution: 1920x1080 (1080p).
4. Frame rate: 30 fps minimum.

### Mobile Screen Recording

1. **iOS**: Settings > Control Center > add Screen Recording, then record from Control Center.
2. **Android**: Swipe down to Quick Settings > Screen Record, or use ADB:
   ```bash
   adb shell screenrecord /sdcard/demo.mp4
   adb pull /sdcard/demo.mp4 assets/demo-recordings/
   ```

### Dual-Screen Setup

For demos that benefit from showing both user and agent perspectives simultaneously:

1. Use OBS Studio with two display capture sources.
2. Arrange sources side-by-side in the OBS canvas.
3. Alternatively, record each screen separately and composite in post-production.

## Pre-Recording Checklist

- [ ] Demo environment is running (`deploy/demo/docker compose up -d`)
- [ ] Demo data is seeded (`cd apps/server && npm run db:seed:demo`)
- [ ] Demo accounts are accessible (see each script for credentials)
- [ ] Screen resolution set to 1920x1080
- [ ] Notifications disabled on recording device
- [ ] Sufficient disk space (estimate 500 MB per 5-min recording)
- [ ] Browser zoom set to 100%
- [ ] Demo script reviewed and practiced

## Recording Process

### Per-Scene Recording

1. Follow the script in `docs/demo-scripts/` for the scenario.
2. Speak the narration points as you go, or record narration separately.
3. Pause briefly between major steps to make editing easier.
4. If a mistake occurs, pause for 2 seconds, then restart from the last step.

### File Naming Convention

Store raw recordings in `assets/demo-recordings/`:

```
{scenario}-{perspective}-{date}.mp4
```

Examples:

- `agentad-desktop-20260429.mp4`
- `agentad-mobile-ios-20260429.mp4`
- `agentjob-dual-screen-20260429.mp4`

### Final Deliverables

Place edited final videos in `assets/demo-recordings/`:

```
{scenario}-demo-final.mp4
```

Examples:

- `agentad-demo-final.mp4`
- `agentdate-demo-final.mp4`
- `agentjob-demo-final.mp4`
- `visionshare-demo-final.mp4`

## Post-Production

1. Trim dead air and mistakes.
2. Add title card with scenario name and BridgeAI logo.
3. Add subtitles/narration if voice-over is used.
4. Export at 1080p, H.264 codec.
5. Keep final file under 100 MB for web sharing.

## Environment Reference

- Demo data specification: `docs/DEMO_DATA.md`
- Environment setup: `docs/DEMO_ENV_SETUP.md`
- Contingency plan: `docs/DEMO_CONTINGENCY_PLAN.md`
- FAQ: `docs/DEMO_FAQ.md`
