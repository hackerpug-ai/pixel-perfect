# SwiftUI

SwiftUI is the framework adapter for an iOS or Mac target. The sandbox is a small Swift package, not a web view. `swift run` renders one story to a PNG with `ImageRenderer`. That PNG is the story's pixel evidence. `verify-catalog.mjs` accepts it when it is a real, non-blank image no wider than the platform viewport.

## Platforms

- mobile-ios
- desktop (Mac)

## Category

Framework

## Capture package

Copy these two files into an empty directory and run `swift run -c release Render badge.png`. The command writes `badge.png` in the current directory. Put that file beside the story's structural artifact as `{state}.png`.

### Package.swift

```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PixelPerfectSwiftUI",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(name: "Render")
    ]
)
```

### Sources/Render/main.swift

```swift
import AppKit
import SwiftUI

struct Badge: View {
    var body: some View {
        Text("Save")
            .font(.system(size: 28, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 32)
            .padding(.vertical, 16)
            .background(Color(red: 0.75, green: 0.12, blue: 0.28), in: RoundedRectangle(cornerRadius: 10))
    }
}

@main
struct Render {
    static func main() {
        let renderer = ImageRenderer(content: Badge())
        renderer.scale = 2
        renderer.proposedSize = ProposedViewSize(width: 180, height: 72)
        guard let image = renderer.nsImage,
              let tiff = image.tiffRepresentation,
              let rep = NSBitmapImageRep(data: tiff),
              let png = rep.representation(using: .png, properties: [:]) else {
            fputs("render produced no image\n", stderr)
            exit(1)
        }
        let out = CommandLine.arguments.dropFirst().first ?? "badge.png"
        do {
            try png.write(to: URL(fileURLWithPath: out))
        } catch {
            fputs("\(error)\n", stderr)
            exit(1)
        }
    }
}
```

Replace `Badge` with the component under test. Keep the `ImageRenderer` path: a handwritten PNG is not a capture.

## Manifest

```json
"capture": {
  "command": "swift run -c release --package-path sandbox Render design/.captures/mobile-ios/badge.png",
  "medium": "png",
  "viewport": "390x844",
  "pixels": "required",
  "goldens": "design/goldens/mobile-ios"
}
```

A platform that cannot render pixels sets `capture.pixels` to `"none"` and gives a `pixels_reason`. It then cannot reach `verified`.
