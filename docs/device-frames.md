# Device Frames Reference

This document defines the HTML structure and CSS for device frames used in pixel-perfect mockups when the `--deviceFrame` flag is enabled.

## Purpose

Device frames provide visual context for mockups by rendering them within realistic device containers. This helps stakeholders understand how the design will appear on target platforms.

**IMPORTANT**: Device frames are for **prototyping and visualization only**. They should never be included in production implementation.

## HTML Structure Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{design_key} Mockup</title>

  <!--
    DEVICE FRAME: FOR PROTOTYPING PURPOSES ONLY
    This frame is a visualization aid for design review.
    DO NOT include this frame in the final implementation.
    The frame represents the target aspect ratio and form factor.
  -->

  <!-- Design System CSS (from config.designSystem) -->
  {cdnLinks}

  <!-- Icon Library (from config.iconLibrary) -->
  {iconSetup}

  <style>
    /* Device Frame Styles */
    .device-frame-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f5f5f5;
      padding: 40px;
    }

    .device-frame {device-type} {
      background: #1a1a1a;
      border-radius: 40px;
      padding: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      position: relative;
    }

    .device-screen {
      background: white;
      overflow: auto;
      position: relative;
    }

    /* Platform-specific frame styles */
    .iphone-frame .device-screen::before {
      /* Dynamic Island / Notch */
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 120px;
      height: 30px;
      background: #1a1a1a;
      border-radius: 0 0 20px 20px;
      z-index: 10;
    }

    .android-frame .device-screen::before {
      /* Camera hole */
      content: '';
      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      width: 16px;
      height: 16px;
      background: #1a1a1a;
      border-radius: 50%;
      z-index: 10;
    }

    .terminal-frame {
      background: #1e1e1e;
      border-radius: 8px;
      padding: 16px;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    }

    .terminal-frame .device-screen {
      background: #1e1e1e;
      color: #d4d4d4;
    }
  </style>
</head>
<body>
  <div class="device-frame-container">
    <div class="device-frame {device-type}">
      <div class="device-screen">
        <!-- MOCKUP CONTENT GOES HERE -->
        {mockup_html}
      </div>
    </div>
  </div>
</body>
</html>
```

## Device Types

| Platform | Device Type Class | Aspect Ratio | Screen Size | Notes |
|----------|------------------|--------------|-------------|-------|
| `mobile-ios` | `iphone-frame` | 9:19.5 | 390 × 844 | Dynamic Island, rounded corners |
| `mobile-android` | `android-frame` | 9:20 | 360 × 800 | Camera hole punch, rounded corners |
| `tablet-ios` | `ipad-frame` | 3:4 | 1024 × 1367 | Larger bezels, home indicator |
| `tablet-android` | `android-tablet-frame` | 3:4 | 800 × 1067 | Minimal bezels |
| `web-mobile` | `mobile-browser-frame` | 9:16 | 375 × 667 | URL bar, navigation controls |
| `web-desktop` | `browser-frame` | 16:9 | 1920 × 1080 | URL bar, tabs, scrollbar |
| `cli` | `terminal-frame` | Custom | 80 × 24 (default) | Monospace, configurable via tokens |
| `tui` | `terminal-frame` | Custom | 120 × 36 (default) | Larger terminal, configurable |

## Aspect Ratio Enforcement

Use CSS `aspect-ratio` property to maintain correct proportions:

```css
.iphone-frame .device-screen {
  width: 390px;
  aspect-ratio: 390 / 844;
}

.android-frame .device-screen {
  width: 360px;
  aspect-ratio: 360 / 800;
}

.ipad-frame .device-screen {
  width: 768px;
  aspect-ratio: 3 / 4;
}
```

## Platform Auto-Detection

Frame type is determined from `design/config.yaml` → `platforms` array:

```yaml
# Single platform - use that frame
platforms:
  - mobile-ios  # → iphone-frame

# Multiple platforms - use first (prioritize mobile)
platforms:
  - mobile-ios
  - web-desktop  # → iphone-frame (mobile prioritized)

# Web + mobile - use mobile frame
platforms:
  - web-desktop
  - web-mobile  # → mobile-browser-frame
```

## Custom Terminal Dimensions

For CLI/TUI platforms, dimensions can be customized via `tokens.yaml`:

```yaml
# tokens.yaml
cli:
  terminal:
    width: 120
    height: 36
    font: "Fira Code"
```

Applied as:

```css
.terminal-frame .device-screen {
  width: calc({width} * 0.6em);
  height: calc({height} * 1.2em);
  font-family: {font}, monospace;
}
```

## Examples

### iPhone 14 Frame

```html
<div class="device-frame-container">
  <div class="device-frame iphone-frame">
    <div class="device-screen">
      <!-- Mockup content with 390×844 aspect ratio -->
    </div>
  </div>
</div>
```

### Android Phone Frame

```html
<div class="device-frame-container">
  <div class="device-frame android-frame">
    <div class="device-screen">
      <!-- Mockup content with 360×800 aspect ratio -->
    </div>
  </div>
</div>
```

### Terminal Window Frame

```html
<div class="device-frame-container">
  <div class="device-frame terminal-frame">
    <div class="device-screen">
      <!-- ASCII art mockup content -->
    </div>
  </div>
</div>
```

## Implementation Notes

1. **Always include the HTML comment** warning that frames are for prototyping only
2. **Frame styles should be scoped** to `.device-frame` classes to avoid conflicts with mockup content
3. **Mockup content should be unmodified** - the frame wraps around it without changing internal structure
4. **Responsive frames**: For desktop browser frames, use `max-width: 100%` to prevent overflow
5. **Print-friendly**: Add `@media print` rules to hide background/shadow when printing mockups

## CSS Variables for Customization

Define in the `<style>` block for easy theming:

```css
:root {
  --device-frame-bg: #1a1a1a;
  --device-frame-border: #333;
  --device-frame-shadow: rgba(0, 0, 0, 0.25);
  --device-frame-radius: 40px;
}
```

Then reference in styles:

```css
.device-frame {
  background: var(--device-frame-bg);
  border: 1px solid var(--device-frame-border);
  box-shadow: 0 25px 50px -12px var(--device-frame-shadow);
  border-radius: var(--device-frame-radius);
}
```
