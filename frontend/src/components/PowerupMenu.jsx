import React from "react";

export default function PowerupMenu({ compact, onSelect, selected }) {
  // displays available powerups with their GIFs; in compact mode show small icons
  return (
    <div className={compact ? "powerup-menu compact" : "powerup-menu"}>
      <PowerupButton
        id="anvil"
        label="Anvil"
        selected={selected === "anvil"}
        onClick={() => onSelect && onSelect("anvil")}
        src={"../assets/Board/Animation/Anvil/Anvil_Falling.gif"}
      />
      <PowerupButton
        id="brick"
        label="Brick"
        selected={selected === "brick"}
        onClick={() => onSelect && onSelect("brick")}
        src={"../assets/Board/Gamepieces/Powerup_Brick.png"}
      />
      <PowerupButton
        id="lightning"
        label="Lightning"
        selected={selected === "lightning"}
        onClick={() => onSelect && onSelect("lightning")}
        src={"../assets/Board/Animation/Lightning/Lightning_0.gif"}
      />
    </div>
  );
}

function PowerupButton({ id, label, selected, onClick, src }) {
  let imgSrc = "";
  try {
    imgSrc = new URL(src, import.meta.url).href;
  } catch (e) {}
  return (
    <button
      className={"powerup-btn" + (selected ? " selected" : "")}
      onClick={onClick}
      title={label}
    >
      {imgSrc ? (
        <div className="btn-with-label">
          <img src={imgSrc} alt={label} />
          <span className="powerup-label">{label}</span>
        </div>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}
