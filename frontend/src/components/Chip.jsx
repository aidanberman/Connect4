import React from "react";

export default function Chip({ value, powerup, highlight, style }) {
  // value: null | 'red' | 'yellow'
  // powerup: null | 'anvil' | 'brick' | 'lightning'
  const className =
    `chip ${value || "empty"}` + (powerup ? ` powerup-${powerup}` : "");
  // For brick powerup we show the brick graphic as the chip image (matches Powerup_Brick.png)
  const chipImage =
    powerup === "brick" ? getPowerupBrickImage(value) : getBaseChipImage(value);

  return (
    <div className={className} style={style}>
      {chipImage && (
        <img
          src={chipImage}
          alt={powerup === "brick" ? `${value} brick` : `${value} chip`}
        />
      )}
      {/* show other powerup gifs (anvil/lightning) when present */}
      {powerup && powerup !== "brick" && (
        <img
          className="powerup-gif"
          src={getPowerupGif(powerup)}
          alt={powerup}
        />
      )}
      {highlight && (
        <img className="chip-win-overlay" src={getWinOverlay()} alt="win" />
      )}
    </div>
  );
}

function getBaseChipImage(color) {
  try {
    return new URL(
      "../assets/Board/Gamepieces/" +
        (color === "red" ? "Chip_Red.png" : "Chip_Yellow.png"),
      import.meta.url
    ).href;
  } catch (e) {
    return "";
  }
}

function getWinOverlay() {
  try {
    return new URL(
      "../assets/Board/Gamepieces/Chip_Shocked.png",
      import.meta.url
    ).href;
  } catch (e) {
    return "";
  }
}

function getPowerupGif(name) {
  try {
    if (name === "anvil")
      return new URL(
        "../assets/Board/Animation/Anvil/Anvil_Falling.gif",
        import.meta.url
      ).href;
    if (name === "lightning")
      return new URL(
        "../assets/Board/Animation/Lightning/Lightning_0.gif",
        import.meta.url
      ).href;
    if (name === "brick")
      return new URL(
        "../assets/Board/Gamepieces/Powerup_Brick.png",
        import.meta.url
      ).href;
  } catch (e) {
    return "";
  }
}

function getPowerupBrickImage(color) {
  try {
    // Use the brick artwork as the chip image for brick powerups.
    // If you later want different images per color, extend this.
    if (color === "yellow") {
      return new URL(
        "../assets/Board/Gamepieces/Powerup_Brick_Yellow.png",
        import.meta.url
      ).href;
    }
    return new URL(
      "../assets/Board/Gamepieces/Powerup_Brick.png",
      import.meta.url
    ).href;
  } catch (e) {
    return "";
  }
}
