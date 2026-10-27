# Insaat (إنصات)

> **"Listen deeply. Follow along."**

Insaat is an offline-focused mobile application that combines a document reader with a synchronized audio lesson player. Built with React Native and Expo, Insaat provides a focused, distraction-free environment for reading texts, lectures, and study materials alongside accompanying audio recordings without requiring an internet connection.

[![GitHub Release](https://img.shields.io/github/v/release/sayeedmunees/insaat?color=E6D4A8&label=Release)](https://github.com/sayeedmunees/insaat/releases)
[![Platform](https://img.shields.io/badge/Platform-Android-green?color=101114)](https://github.com/sayeedmunees/insaat/releases)
[![Expo SDK](https://img.shields.io/badge/Expo_SDK-57-blue?color=202126)](https://docs.expo.dev/)
[![License](https://img.shields.io/badge/License-Source--Available-yellow?color=E6D4A8)](LICENSE)

---

## Features

All features listed below are implemented and verified in the codebase:

* **Offline PDF Reader:**
  * Open and view PDF documents locally using `react-native-pdf`.
  * Fullscreen reading area with stationary tap detection to toggle document controls without interfering with page scrolling.
  * Fast document switching and one-tap close.

* **Audio Player & Playlist Management:**
  * Pick single or multiple audio files from device storage using the native system document picker.
  * Dynamically append tracks to your study playlist with the `+` button, or replace the entire queue by selecting multiple files.
  * Displays active track title and position in the playlist (e.g., `Track 1 of 4`).
  * One-tap playlist clearing (`X` button).

* **Playback & Navigation Controls:**
  * Complete playback controls: **Play**, **Pause**, **Rewind 10s**, and **Forward 10s**.
  * **Previous Track** and **Next Track** buttons to traverse the playlist in order.
  * Strict boundary handling: Previous is disabled on the first track, Next is disabled on the last track (no unexpected looping).
  * Automatic seamless advancement to the next track when the current track finishes.
  * Interactive, scrubbable playback progress bar.

* **Playback Speed Control:**
  * Seven discrete playback speeds: `0.5X`, `0.75X`, `1.0X`, `1.25X`, `1.5X`, `1.75X`, and `2.0X`.
  * Minimal speed button showing the active rate directly on the player bar.
  * Speed persists across track switches, pause/resume, and app restarts.

* **Reliable Local Storage & Sandboxing:**
  * Selected documents and audio lessons are copied directly into the app's persistent storage directory (`FileSystem.documentDirectory`).
  * Files remain accessible even after system cache cleaning or app closure, without requiring broad external storage permissions.

* **Complete Session Persistence & Restoration:**
  * Uses `@react-native-async-storage/async-storage` to automatically remember:
    * Last opened PDF document.
    * Current audio playlist and track order.
    * Active track index.
    * Exact playback timestamp in seconds.
    * Selected playback speed.
  * Automatic saves on state change, playback pause, and when the app is backgrounded.
  * Restores cleanly on launch with playback **paused** by default. Missing or externally deleted files are handled gracefully without crashing.

* **Tailored Dark Design:**
  * Cohesive dark visual aesthetic (`#101114`, `#202126`, `#F4F1E8`, `#A5A5AD`, `#E6D4A8`).
  * Native navigation tabs and edge-to-edge safe area support.

---

## Installation for Android Users

Insaat is distributed as an installable Android APK via GitHub Releases. It is not currently published on Google Play or other app marketplaces.

### How to Install

1. Go to the [Insaat GitHub Releases](https://github.com/sayeedmunees/insaat/releases) page.
2. Under the latest release (e.g., **v1.0.0**), expand the **Assets** section.
3. Download the `insaat-v1.0.0.apk` file to your Android phone.
4. Open the downloaded APK from your browser's download manager or your device's File Manager.
5. If prompted by Android, enable **"Install unknown apps"** for your browser or file manager in Settings.
6. Tap **Install** and launch Insaat.

> **Security Notice:** Installing APKs directly from outside Google Play requires enabling installation from unknown sources. Users install APKs at their own discretion. Always verify that you are downloading official releases exclusively from the authentic repository: [`https://github.com/sayeedmunees/insaat/releases`](https://github.com/sayeedmunees/insaat/releases).

---

## Requirements

### For Users
* An Android device running **Android 8.0 (Oreo / API level 26)** or newer.

### For Developers
* **Node.js:** v18, v20, or newer (LTS recommended).
* **Package Manager:** `npm` (project uses `package-lock.json`).
* **Expo CLI:** Bundled via `npx expo`.
* **EAS CLI:** `npm install -g eas-cli` or via `npx eas-cli`.
* **Android Development:** Android Studio with Android SDK (API 34/35) or a physical Android test device with USB debugging enabled.

---

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/sayeedmunees/insaat.git
cd insaat
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Development Server

```bash
npx expo start
```

Press `a` in the terminal to open on a connected Android device or emulator.

### 4. Running Verification Checks

Before making commits or proposing changes, run the project checks:

* **TypeScript Type Checking:**
  ```bash
  npx tsc --noEmit
  ```

* **Expo Configuration & Dependency Diagnostic:**
  ```bash
  npx expo-doctor
  ```

### 5. Building an Android Preview APK Locally or with EAS

To generate an installable standalone preview APK using EAS Build:

```bash
eas build --platform android --profile preview
```

---

## Architecture & Technology Stack

* **Framework:** [Expo](https://expo.dev/) (SDK 57) / [React Native](https://reactnative.dev/) (v0.86) / React 19
* **Language:** TypeScript 5.9
* **Router & Navigation:** [Expo Router](https://docs.expo.dev/router/introduction/) (file-based navigation in `src/app/` with native tabs)
* **Audio Playback:** [`expo-audio`](https://docs.expo.dev/versions/latest/sdk/audio/) (native ExoPlayer integration on Android)
* **PDF Engine:** [`react-native-pdf`](https://github.com/wonday/react-native-pdf) with `react-native-blob-util`
* **File Management:** [`expo-file-system`](https://docs.expo.dev/versions/latest/sdk/filesystem/) (sandboxed persistent document storage)
* **Session Persistence:** [`@react-native-async-storage/async-storage`](https://react-native-async-storage.github.io/async-storage/)
* **Styling:** [NativeWind v4](https://www.nativewind.dev/) (Tailwind CSS v3.4)
* **Icons:** [`lucide-react-native`](https://lucide.dev/)

---

## Contributing, Feature Requests & Bug Reports

Contributions, discussions, and feedback are welcome:

* **Report a Bug:** Open an issue via [GitHub Issues](https://github.com/sayeedmunees/insaat/issues) with reproduction steps, your Android OS version, and any relevant logs.
* **Request a Feature:** Submit a feature request via [GitHub Issues](https://github.com/sayeedmunees/insaat/issues) outlining your use case.
* **Submit Code:** Fork the repository, create a descriptive feature branch, ensure `npx tsc --noEmit` and `npx expo-doctor` pass, and open a Pull Request against `main`.

Please review the [LICENSE](LICENSE) terms regarding contributions prior to submitting pull requests.

---

## License

Copyright (c) 2026 Sayeed Munees.

Insaat is published as **source-available** software under the [Insaat Source-Available License](LICENSE).

### Summary of Terms

* **Allowed:**
  * Viewing and inspecting the source code.
  * Downloading, compiling, and running Insaat for your own personal, non-commercial use on personal devices.
  * Submitting bug reports, feature suggestions, and contributions to this repository.
* **Not Allowed Without Prior Written Permission:**
  * Redistributing, hosting, or publishing the software, binaries (such as `.apk` files), or modified versions to third parties.
  * Publishing or distributing Insaat on app stores (Google Play, Apple App Store, F-Droid, or third-party stores).
  * Selling, sublicensing, or commercially exploiting the software.

For full legal terms, please read the complete [LICENSE](LICENSE) file.

---

## Releases

To download official pre-built APK packages, visit the [Insaat Releases](https://github.com/sayeedmunees/insaat/releases) page.
