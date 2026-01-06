import React, { useState, useEffect } from "react";
import GameBoard from "./components/GameBoard";
import PowerupMenu from "./components/PowerupMenu";
import logoImg from "./assets/Menu/Logo/Logo_Together.png";
import classicBtn from "./assets/Menu/Buttons/Classic_Button.png";
import arcadeBtn from "./assets/Menu/Buttons/Arcade_Button.png";
import startImg from "./assets/Menu/Buttons/Button_Start.png";
import helpImg from "./assets/Menu/Buttons/Button_Help.png";
import helpAnvil from "./assets/Help/Help_Anvil.gif";
import helpLightning from "./assets/Help/Help_Lightning.gif";
import helpPlacing from "./assets/Help/Help_PlacingChip.gif";
import helpWinHoz from "./assets/Help/Help_WinHoz.gif";
import helpWinVert from "./assets/Help/Help_WinVert.gif";
import helpWinDiag from "./assets/Help/Help_WinDiag.gif";
import helpWinCDiag from "./assets/Help/Help_WinCDiag.gif";
import helpClose from "./assets/Menu/Buttons/Help_Settings_Exit.png";

export default function App() {
  const [screen, setScreen] = useState("menu"); // menu or play
  const [mode, setMode] = useState("classic"); // classic or arcade
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    console.log("App render: screen=", screen);
  }, [screen]);

  if (screen === "menu") {
    const logoSrc = logoImg;
    const startBtn = startImg;
    const helpBtn = helpImg;

    return (
      <div className="app-center menu-screen">
        <img src={logoSrc} alt="logo" className="menu-logo" />
        <div className="menu-buttons">
          <button
            className="img-btn"
            onClick={() => {
              console.log("Start clicked");
              setScreen("play");
            }}
          >
            <img src={startBtn} alt="Start" />
          </button>
          <button className="img-btn" onClick={() => setShowHelpModal(true)}>
            <img src={helpBtn} alt="Help" />
          </button>
        </div>
        {showHelpModal && (
          <div className="help-modal" role="dialog" aria-modal="true">
            <div className="help-content">
              <button
                className="help-close"
                onClick={() => setShowHelpModal(false)}
              >
                <img src={helpClose} alt="close" />
              </button>
              <div className="help-grid">
                <img src={helpAnvil} alt="Help Anvil" />
                <img src={helpLightning} alt="Help Lightning" />
                <img src={helpPlacing} alt="Help Placing" />
                <img src={helpWinHoz} alt="Help Win Hoz" />
                <img src={helpWinVert} alt="Help Win Vert" />
                <img src={helpWinDiag} alt="Help Win Diag" />
                <img src={helpWinCDiag} alt="Help Win C Diag" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // help is shown as a popup from menu; no separate help screen

  // play screen
  return (
    <div className="play-screen">
      <header
        style={{ display: "flex", justifyContent: "flex-end", padding: 8 }}
      >
        <button
          onClick={() => setScreen("menu")}
          style={{ background: "transparent", border: "none", padding: 0 }}
        >
          <img src={helpClose} alt="Back" style={{ height: 40 }} />
        </button>
      </header>

      {/* mode-select moved here so it appears above the board */}
      <div
        style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}
      >
        <div className="mode-select">
          <label
            style={{
              marginRight: 12,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <input
              type="radio"
              checked={mode === "classic"}
              onChange={() => setMode("classic")}
              style={{ display: "none" }}
            />
            <img
              src={classicBtn}
              alt="Classic"
              style={{
                height: 48,
                cursor: "pointer",
                opacity: mode === "classic" ? 1 : 0.8,
              }}
              onClick={() => setMode("classic")}
            />
          </label>
          <label style={{ display: "inline-flex", alignItems: "center" }}>
            <input
              type="radio"
              checked={mode === "arcade"}
              onChange={() => setMode("arcade")}
              style={{ display: "none" }}
            />
            <img
              src={arcadeBtn}
              alt="Arcade"
              style={{
                height: 48,
                cursor: "pointer",
                opacity: mode === "arcade" ? 1 : 0.8,
              }}
              onClick={() => setMode("arcade")}
            />
          </label>
        </div>
      </div>

      <main>
        <GameBoard mode={mode} vsAI={true} />
      </main>
    </div>
  );
}
