cask "qui" do
  arch arm: "arm64", intel: "x64"

  version "0.0.7"
  sha256 :no_check

  url "https://github.com/Johann-Goncalves-Pereira/Qui/releases/download/v#{version}/Qui-#{version}-#{arch}.dmg"
  name "Qui"
  desc "Native qBittorrent desktop manager with Electron and Docker companion services"
  homepage "https://github.com/Johann-Goncalves-Pereira/Qui"

  livecheck do
    url :url
    strategy :github_latest
  end

  auto_updates false

  app "Qui.app"

  zap trash: [
    "~/Library/Application Support/Qui",
    "~/Library/Caches/com.autobrr.qui.desktop",
    "~/Library/Caches/com.autobrr.qui.desktop.ShipIt",
    "~/Library/Preferences/com.autobrr.qui.desktop.plist",
    "~/Library/Saved Application State/com.autobrr.qui.desktop.savedState",
  ]

  caveats <<~EOS
    Qui is currently unsigned. If macOS Gatekeeper blocks opening the app,
    run the following command in Terminal:
      xattr -cr /Applications/Qui.app

    Or go to System Settings -> Privacy & Security and click "Open Anyway".
  EOS
end
