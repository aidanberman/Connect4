import React, { useEffect, useRef, useState } from "react";
import Chip from "./Chip";

const ROWS = 6;
const COLS = 7;
const GRID = {
  leftPct: 0.07,
  topPct: 0.08,
  rightPct: 0.07,
  bottomPct: 0.06,
  gridWidthPct: 0.86,
  gridHeightPct: 0.86,
};

// horizontal offsets (px at base cell size) for falling chip per column 0..6
const COLUMN_OFFSETS = [-24, -16, -8, 0, 8, 16, 24];

export default function GameBoard({ mode = "classic", vsAI = false }) {
  const boardRef = useRef(null);
  const [boardRect, setBoardRect] = useState({ w: 0, h: 0, left: 0, top: 0 });
  const [board, setBoard] = useState(() =>
    Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null))
  );
  const [current, setCurrent] = useState("red");
  const [winningLine, setWinningLine] = useState([]);
  const [chipScale] = useState(1);
  const [perCellAdjust, setPerCellAdjust] = useState(() => {
    try {
      const raw = localStorage.getItem("connect4_perCellAdjust");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === ROWS) return parsed;
      }
    } catch (e) {}
    return Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => ({ dx: 0, dy: 0, scale: 1 }))
    );
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "connect4_perCellAdjust",
        JSON.stringify(perCellAdjust)
      );
    } catch (e) {}
  }, [perCellAdjust]);

  // reset game state to initial values
  function resetGame() {
    setBoard(
      Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, () => null)
      )
    );
    setCurrent("red");
    setWinningLine([]);
    setWinner(null);
    setFallingChip(null);
    setFallAnim(null);
    setAnvilAnim(null);
    setActiveAnim(null);
    setSelectedPowerup(null);
    setAvailable({
      red: { anvil: true, lightning: true, brick: true },
      yellow: { anvil: true, lightning: true, brick: true },
    });
  }

  // when mode changes, enable/disable powerups availability
  useEffect(() => {
    if (mode === "classic") {
      setAvailable({
        red: { anvil: false, lightning: false, brick: false },
        yellow: { anvil: false, lightning: false, brick: false },
      });
    } else {
      setAvailable({
        red: { anvil: true, lightning: true, brick: true },
        yellow: { anvil: true, lightning: true, brick: true },
      });
    }
    // reset the game whenever the mode changes so the board is cleared
    resetGame();
  }, [mode]);

  // enhanced AI: return an action object {action:'place', col} or {action:'powerup', powerup, row?, col?}
  function computeAIMove() {
    const tryPlaceWinner = (bd, col, color) => {
      const newBd = bd.map((r) => r.slice());
      let toRow = null;
      for (let r = ROWS - 1; r >= 0; r--)
        if (!newBd[r][col]) {
          toRow = r;
          break;
        }
      if (toRow === null) return null;
      newBd[toRow][col] = { color };
      const found = findWinner(newBd);
      return found
        ? { winner: found.winner, line: found.line, row: toRow }
        : null;
    };

    // 1) try normal place win for AI (yellow)
    for (let c = 0; c < COLS; c++) {
      const res = tryPlaceWinner(board, c, "yellow");
      if (res && res.winner === "yellow") return { action: "place", col: c };
    }

    // 2) try brick powerup to win immediately (if available)
    if (available.yellow && available.yellow.brick) {
      for (let c = 0; c < COLS; c++) {
        // find target row where brick would land
        let toRow = null;
        for (let r = ROWS - 1; r >= 0; r--)
          if (!board[r][c]) {
            toRow = r;
            break;
          }
        if (toRow === null) continue;
        const newBd = board.map((r) => r.slice());
        newBd[toRow][c] = { color: "yellow", brick: true };
        const found = findWinner(newBd);
        if (found && found.winner === "yellow")
          return { action: "powerup", powerup: "brick", row: toRow, col: c };
      }
    }

    // 3) check opponent immediate wins and prefer powerup blocks
    for (let c = 0; c < COLS; c++) {
      // simulate opponent (red) placement
      const oppRes = tryPlaceWinner(board, c, "red");
      if (oppRes && oppRes.winner === "red") {
        // opponent can win by placing in column c
        // prefer brick block if available (place a brick at that exact cell)
        // find the row where red would place
        let toRow = null;
        for (let r = ROWS - 1; r >= 0; r--)
          if (!board[r][c]) {
            toRow = r;
            break;
          }
        if (toRow !== null) {
          if (available.yellow && available.yellow.brick)
            return { action: "powerup", powerup: "brick", row: toRow, col: c };
          // lightning can sometimes flip a horizontal line; if opponent's winning line is horizontal use lightning
          if (available.yellow && available.yellow.lightning && oppRes.line) {
            const horiz = oppRes.line.every((p) => p.r === oppRes.line[0].r);
            if (horiz) {
              // target the row of the potential win, pick a col in that row (use center if possible)
              const targetRow = oppRes.line[0].r;
              const targetCol = Math.min(Math.max(3, 0), COLS - 1);
              return {
                action: "powerup",
                powerup: "lightning",
                row: targetRow,
                col: targetCol,
              };
            }
          }
          // anvil clears a column and can remove the stacked winning chips
          if (available.yellow && available.yellow.anvil)
            return { action: "powerup", powerup: "anvil", col: c };
          // fallback: place in that column to block normally
          return { action: "place", col: c };
        }
      }
    }

    // 4) fallback: try to create two-step winning setups (simple heuristic) - prefer center
    const order = [3, 2, 4, 1, 5, 0, 6];
    for (const c of order) {
      for (let r = ROWS - 1; r >= 0; r--)
        if (!board[r][c]) return { action: "place", col: c };
    }
    return null;
  }

  const [fallingChip, setFallingChip] = useState(null);
  const [fallAnim, setFallAnim] = useState(null);
  const [anvilAnim, setAnvilAnim] = useState(null);
  const [activeAnim, setActiveAnim] = useState(null);
  const [selectedPowerup, setSelectedPowerup] = useState(null);
  const [available, setAvailable] = useState({
    red: { anvil: true, lightning: true, brick: true },
    yellow: { anvil: true, lightning: true, brick: true },
  });
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    if (!vsAI) return;
    if (winner) return;
    if (current !== "yellow") return;
    if (fallAnim || anvilAnim || activeAnim) return;
    const aiAction = computeAIMove();
    if (!aiAction) return;
    const thinkDelay = 600;
    const t = setTimeout(() => {
      // execute AI action
      if (aiAction.action === "place") {
        handleColumnClick(0, aiAction.col, true);
      } else if (aiAction.action === "powerup") {
        const p = aiAction.powerup;
        if (p === "brick") {
          usePowerupAt(aiAction.row, aiAction.col, "brick", "yellow");
        } else if (p === "anvil") {
          usePowerupAt(0, aiAction.col, "anvil", "yellow");
        } else if (p === "lightning") {
          usePowerupAt(aiAction.row, aiAction.col, "lightning", "yellow");
        }
      }
    }, thinkDelay);
    return () => clearTimeout(t);
  }, [current, vsAI, fallAnim, anvilAnim, activeAnim, winner, board]);

  const blueBoardImg = new URL("../assets/Menu/BlueBoard.png", import.meta.url)
    .href;
  const boardBackImg = new URL(
    "../assets/Board/Construction/Board_Back.png",
    import.meta.url
  ).href;
  const boardFrontImg = new URL(
    "../assets/Board/Construction/Board_Front.png",
    import.meta.url
  ).href;
  const redSidebarImg = new URL(
    "../assets/Board/Construction/Sidebar_Red.png",
    import.meta.url
  ).href;
  const yellowSidebarImg = new URL(
    "../assets/Board/Construction/Sidebar_Yellow.png",
    import.meta.url
  ).href;

  useEffect(() => {
    function update() {
      if (!boardRef.current) return;
      const r = boardRef.current.getBoundingClientRect();
      setBoardRect({ w: r.width, h: r.height, left: r.left, top: r.top });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  function startFallAnimation(fc) {
    const gridLeftPx = GRID.leftPct * boardRect.w;
    const gridTopPx = GRID.topPct * boardRect.h;
    const gridWidth = boardRect.w * (1 - GRID.leftPct - GRID.rightPct);
    const gridHeight = boardRect.h * (1 - GRID.topPct - GRID.bottomPct);
    const cellW = gridWidth / COLS;
    const cellH = gridHeight / ROWS;
    // apply per-column horizontal offset (scale offset with cell width relative to base 72px)
    const baseCell = 72; // reference cell width for the provided offsets
    const colOffset = (COLUMN_OFFSETS[fc.col] || 0) * (cellW / baseCell);
    const left = gridLeftPx + fc.col * cellW + colOffset;
    const startTop = gridTopPx - cellH;
    const endTop = gridTopPx + fc.toRow * cellH;
    const width =
      fc.powerup === "brick" ? Math.round(cellW * 0.7) : Math.round(cellW);
    const height =
      fc.powerup === "brick" ? Math.round(cellH * 0.7) : Math.round(cellH);
    setFallAnim({ left, top: startTop, endTop, width, height, cellW, cellH });
    setTimeout(() => setFallAnim((s) => (s ? { ...s, top: s.endTop } : s)), 20);
  }

  function handleColumnClick(row, col, isAI = false) {
    if (winner) return;
    // if not an AI-invoked placement, block clicks during AI's turn
    if (!isAI && vsAI && current !== "red") return;
    if (activeAnim || anvilAnim || fallAnim) return;
    // If a powerup is selected, delegate to the powerup handler (row may be used by some powerups)
    if (selectedPowerup) {
      usePowerupAt(row, col, selectedPowerup, current);
      return;
    }

    // Normal placement: find lowest empty cell in column
    let toRow = null;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!board[r][col]) {
        toRow = r;
        break;
      }
    }
    if (toRow === null) return; // column full
    const fc = { col, toRow, color: current, powerup: null };
    if (boardRect.w > 0) {
      setFallingChip(fc);
      startFallAnimation(fc);
    } else {
      applyImmediatePlacement(fc);
    }
  }

  function applyImmediatePlacement(fc) {
    const { col, toRow, color, powerup } = fc;
    const newBoard = board.map((r) => r.slice());
    if (powerup === "brick") {
      newBoard[toRow][col] = { color, brick: true };
      setAvailable((prev) => ({
        ...prev,
        [color]: { ...prev[color], brick: false },
      }));
    } else {
      newBoard[toRow][col] = { color };
    }
    const found = findWinner(newBoard);
    setBoard(newBoard);
    if (found) {
      setWinner(found.winner);
      setWinningLine(found.line);
      setTimeout(() => resetGame(), 1800);
    } else setCurrent((prev) => (prev === "red" ? "yellow" : "red"));
    setFallingChip(null);
    setFallAnim(null);
    setSelectedPowerup(null);
  }

  function usePowerupAt(row, col, powerup, color) {
    if (boardRect.w === 0) {
      const newBoard = board.map((r) => r.slice());
      if (powerup === "brick") newBoard[row][col] = { color, brick: true };
      else applyPowerup(newBoard, row, col, color, powerup);
      setAvailable((prev) => ({
        ...prev,
        [color]: { ...prev[color], [powerup]: false },
      }));
      const found = findWinner(newBoard);
      setBoard(newBoard);
      if (found) {
        setWinner(found.winner);
        setWinningLine(found.line);
        setTimeout(() => resetGame(), 1800);
      } else setCurrent((prev) => (prev === "red" ? "yellow" : "red"));
      setSelectedPowerup(null);
      return;
    }
    if (powerup === "anvil") {
      const falling = new URL(
        "../assets/Board/Animation/Anvil/Anvil_Falling.gif",
        import.meta.url
      ).href;
      const explodeAnvil = new URL(
        "../assets/Board/Animation/Anvil/Exploding_Anvil.gif",
        import.meta.url
      ).href;
      const explodeRed = new URL(
        "../assets/Board/Animation/Anvil/Exploding_Red.gif",
        import.meta.url
      ).href;
      const explodeYellow = new URL(
        "../assets/Board/Animation/Anvil/Exploding_Yellow.gif",
        import.meta.url
      ).href;
      const fallingDur = 900;
      const explodeDur = 700;
      const gridLeftPx = GRID.leftPct * boardRect.w;
      const gridTopPx = GRID.topPct * boardRect.h;
      const gridWidth = boardRect.w * (1 - GRID.leftPct - GRID.rightPct);
      const gridHeight = boardRect.h * (1 - GRID.topPct - GRID.bottomPct);
      const cellW = gridWidth / COLS;
      const cellH = gridHeight / ROWS;
      const left = gridLeftPx + col * cellW;
      const startTop = gridTopPx - cellH;
      let impactRow = null;
      for (let rr = 0; rr < ROWS; rr++) {
        if (board[rr][col]) {
          impactRow = rr;
          break;
        }
      }
      if (impactRow === null) impactRow = ROWS - 1;
      const endTop = gridTopPx + impactRow * cellH;
      const width = Math.round(cellW * 0.9);
      const fallHeight = Math.round(gridHeight);
      setAnvilAnim({
        left,
        top: startTop,
        endTop,
        width,
        height: fallHeight,
        img: falling,
        stage: "fall",
        row: impactRow,
        col,
        color,
      });
      setTimeout(
        () => setAnvilAnim((s) => (s ? { ...s, top: s.endTop } : s)),
        20
      );
      setTimeout(() => {
        setAnvilAnim((s) =>
          s
            ? (() => {
                const cellAdj = (perCellAdjust[impactRow] || [])[col] || {
                  dx: 0,
                  dy: 0,
                  scale: 1,
                };
                const cellLeftPx = gridLeftPx + col * cellW + (cellAdj.dx || 0);
                const cellTopPx =
                  gridTopPx + impactRow * cellH + (cellAdj.dy || 0);
                const newW = Math.round(cellW * (cellAdj.scale || 1));
                const newH = Math.round(cellH * (cellAdj.scale || 1));
                const hit = board[impactRow] && board[impactRow][col];
                let img = explodeAnvil;
                if (hit && hit.color === "red") img = explodeRed;
                else if (hit && hit.color === "yellow") img = explodeYellow;
                return {
                  ...s,
                  stage: "explode",
                  img,
                  left: Math.round(cellLeftPx + (cellW - newW) / 2),
                  top: Math.round(cellTopPx + (cellH - newH) / 2),
                  height: newH,
                  width: newW,
                };
              })()
            : s
        );
      }, fallingDur);
      setTimeout(() => {
        const newBoard = board.map((r) => r.slice());
        applyPowerup(newBoard, impactRow, col, color, powerup);
        setAvailable((prev) => ({
          ...prev,
          [color]: { ...prev[color], [powerup]: false },
        }));
        const found = findWinner(newBoard);
        setBoard(newBoard);
        if (found) {
          setWinner(found.winner);
          setWinningLine(found.line);
          setTimeout(() => resetGame(), 1800);
        } else setCurrent((prev) => (prev === "red" ? "yellow" : "red"));
        setAnvilAnim(null);
        setSelectedPowerup(null);
      }, fallingDur + explodeDur);
    } else if (powerup === "lightning") {
      const lightning = new URL(
        "../assets/Board/Animation/Lightning/Lightning_0.gif",
        import.meta.url
      ).href;
      setActiveAnim({ powerup, row, col, color, img: lightning });
      const delay = 900;
      setTimeout(() => {
        const newBoard = board.map((r) => r.slice());
        applyPowerup(newBoard, row, col, color, powerup);
        setAvailable((prev) => ({
          ...prev,
          [color]: { ...prev[color], [powerup]: false },
        }));
        const found = findWinner(newBoard);
        setBoard(newBoard);
        if (found) {
          setWinner(found.winner);
          setWinningLine(found.line);
          setTimeout(() => resetGame(), 1800);
        } else setCurrent((prev) => (prev === "red" ? "yellow" : "red"));
        setActiveAnim(null);
        setSelectedPowerup(null);
      }, delay);
    } else {
      if (powerup === "brick") {
        const fc = { col, toRow: row, color, powerup: "brick" };
        if (boardRect.w > 0) {
          setFallingChip(fc);
          startFallAnimation(fc);
        } else applyImmediatePlacement(fc);
        return;
      }
      const delay = 600;
      setActiveAnim({ powerup, row, col, color });
      setTimeout(() => {
        const newBoard = board.map((r) => r.slice());
        applyPowerup(newBoard, row, col, color, powerup);
        setAvailable((prev) => ({
          ...prev,
          [color]: { ...prev[color], [powerup]: false },
        }));
        const found = findWinner(newBoard);
        setBoard(newBoard);
        if (found) {
          setWinner(found.winner);
          setWinningLine(found.line);
          setTimeout(() => resetGame(), 1800);
        } else setCurrent((prev) => (prev === "red" ? "yellow" : "red"));
        setActiveAnim(null);
        setSelectedPowerup(null);
      }, delay);
    }
  }

  function applyPowerup(bd, row, col, color, powerup) {
    if (powerup === "anvil") {
      for (let r = 0; r < ROWS; r++) {
        if (bd[r][col] && bd[r][col].brick) continue;
        bd[r][col] = null;
      }
    } else if (powerup === "brick") {
      bd[row][col] = { color, brick: true };
    } else if (powerup === "lightning") {
      bd[row][col] = { color };
      for (let c = 0; c < COLS; c++) {
        if (c === col) continue;
        if (bd[row][c] && bd[row][c].color && !bd[row][c].brick) {
          bd[row][c].color = bd[row][c].color === "red" ? "yellow" : "red";
        }
      }
    }
  }

  function findWinner(bd) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = bd[r][c];
        if (!cell || !cell.color) continue;
        const color = cell.color;
        const dirs = [
          [0, 1],
          [1, 0],
          [1, 1],
          [-1, 1],
        ];
        for (const [dr, dc] of dirs) {
          const line = [{ r, c }];
          let rr = r,
            cc = c;
          for (let i = 1; i < 4; i++) {
            rr += dr;
            cc += dc;
            if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
            const next = bd[rr][cc];
            if (!next || next.color !== color) break;
            line.push({ r: rr, c: cc });
          }
          if (line.length === 4) return { winner: color, line };
        }
      }
    }
    return null;
  }

  function boardIsFull(bd) {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) if (!bd[r][c]) return false;
    return true;
  }

  const helpAnims = {
    anvil: new URL("../assets/Help/Help_Anvil.gif", import.meta.url).href,
    lightning: new URL("../assets/Help/Help_Lightning.gif", import.meta.url)
      .href,
    place: new URL("../assets/Help/Help_PlacingChip.gif", import.meta.url).href,
    winH: new URL("../assets/Help/Help_WinHoz.gif", import.meta.url).href,
    winV: new URL("../assets/Help/Help_WinVert.gif", import.meta.url).href,
    winD1: new URL("../assets/Help/Help_WinDiag.gif", import.meta.url).href,
    winD2: new URL("../assets/Help/Help_WinCDiag.gif", import.meta.url).href,
  };

  return (
    <div className={`game-root ${mode === "classic" ? "classic-mode" : ""}`}>
      <div className="board-wrap">
        <div className="sidebar-left arcade-side">
          <div className="sidebar-art">
            <img src={redSidebarImg} alt="red sidebar" />
            <div className="sidebar-powerups overlay-left">
              <button
                className="powerup-small"
                disabled={!available.red.anvil || current !== "red"}
                onClick={() =>
                  setSelectedPowerup((s) => (s === "anvil" ? null : "anvil"))
                }
                style={{ opacity: selectedPowerup === "anvil" ? 0.25 : 1 }}
              >
                <img
                  src={
                    new URL(
                      "../assets/Board/Construction/Button_Anvil_Red.png",
                      import.meta.url
                    ).href
                  }
                  alt="anvil"
                />
              </button>
              <button
                className="powerup-small"
                disabled={!available.red.lightning || current !== "red"}
                onClick={() =>
                  setSelectedPowerup((s) =>
                    s === "lightning" ? null : "lightning"
                  )
                }
                style={{ opacity: selectedPowerup === "lightning" ? 0.25 : 1 }}
              >
                <img
                  src={
                    new URL(
                      "../assets/Board/Construction/Button_Lightning_Red.png",
                      import.meta.url
                    ).href
                  }
                  alt="lightning"
                />
              </button>
              <button
                className="powerup-small"
                disabled={!available.red.brick || current !== "red"}
                onClick={() =>
                  setSelectedPowerup((s) => (s === "brick" ? null : "brick"))
                }
                style={{ opacity: selectedPowerup === "brick" ? 0.25 : 1 }}
              >
                <img
                  src={
                    new URL(
                      "../assets/Board/Construction/Button_Brick_Red.png",
                      import.meta.url
                    ).href
                  }
                  alt="brick"
                />
              </button>
            </div>
          </div>
        </div>
        <div className="board-image" style={{ position: "relative" }}>
          <img
            src={blueBoardImg}
            alt="blue background"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "auto",
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
          <img
            ref={boardRef}
            src={boardBackImg}
            alt="board back"
            onLoad={() => {
              const r = boardRef.current?.getBoundingClientRect();
              if (r)
                setBoardRect({
                  w: r.width,
                  h: r.height,
                  left: r.left,
                  top: r.top,
                });
            }}
            style={{
              display: "block",
              maxWidth: "640px",
              width: "100%",
              height: "auto",
              zIndex: 10,
            }}
          />

          {boardRect.w > 0 &&
            (() => {
              const gridLeft = boardRect.left + GRID.leftPct * boardRect.w;
              const gridTop = boardRect.top + GRID.topPct * boardRect.h;
              const gridWidth =
                boardRect.w * (1 - GRID.leftPct - GRID.rightPct);
              const gridHeight =
                boardRect.h * (1 - GRID.topPct - GRID.bottomPct);
              const cellW = gridWidth / COLS;
              const cellH = gridHeight / ROWS;
              const winSet = new Set(winningLine.map((p) => `${p.r},${p.c}`));
              return (
                <div
                  className="holes-overlay"
                  style={{
                    ["--chip-scale"]: chipScale,
                    zIndex: 2000,
                    pointerEvents: "auto",
                  }}
                >
                  {board.map((row, rIdx) =>
                    row.map((cell, cIdx) => {
                      const cellAdj = perCellAdjust[rIdx][cIdx] || {
                        dx: 0,
                        dy: 0,
                        scale: 1,
                      };
                      const cellWPercent = (GRID.gridWidthPct * 100) / COLS;
                      const cellHPercent = (GRID.gridHeightPct * 100) / ROWS;
                      const leftBasePct =
                        GRID.leftPct * 100 + cIdx * cellWPercent;
                      const topBasePct =
                        GRID.topPct * 100 + rIdx * cellHPercent;
                      const leftStyle = cellAdj.dx
                        ? `calc(${leftBasePct}% + ${cellAdj.dx}px)`
                        : `${leftBasePct}%`;
                      const topStyle = cellAdj.dy
                        ? `calc(${topBasePct}% + ${cellAdj.dy}px)`
                        : `${topBasePct}%`;
                      const style = {
                        left: leftStyle,
                        top: topStyle,
                        width: `${cellWPercent}%`,
                        height: `${cellHPercent}%`,
                        zIndex: 2100 + rIdx,
                        ["--chip-scale"]: `${chipScale * (cellAdj.scale || 1)}`,
                        pointerEvents: "auto",
                      };
                      return (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          className="hole-cell"
                          style={style}
                          onClick={() => handleColumnClick(rIdx, cIdx)}
                        >
                          {cell && (
                            <Chip
                              value={cell.color}
                              powerup={cell.brick ? "brick" : null}
                              highlight={winSet.has(`${rIdx},${cIdx}`)}
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}

          {activeAnim &&
            boardRect.w > 0 &&
            (() => {
              const gridLeftPx = GRID.leftPct * boardRect.w;
              const gridTopPx = GRID.topPct * boardRect.h;
              const gridWidth = boardRect.w * (GRID.gridWidthPct || 1);
              const gridHeight = boardRect.h * (GRID.gridHeightPct || 1);
              const cellW = gridWidth / COLS;
              const cellH = gridHeight / ROWS;
              let left = gridLeftPx;
              let top = gridTopPx;
              let width = gridWidth;
              let height = gridHeight;
              if (activeAnim.powerup === "lightning") {
                top = gridTopPx + (activeAnim.row || 0) * cellH;
                left = gridLeftPx;
                width = gridWidth;
                height = cellH;
              } else if (activeAnim.powerup === "anvil") {
                left = gridLeftPx + (activeAnim.col || 0) * cellW;
                top = gridTopPx;
                width = cellW;
                height = gridHeight;
              } else {
                left = gridLeftPx + gridWidth / 2 - 280;
                top = gridTopPx + gridHeight / 2 - 140;
                width = 560;
                height = 280;
              }
              const animStyle = {
                position: "absolute",
                left: `${Math.round(left)}px`,
                top: `${Math.round(top)}px`,
                width: `${Math.round(width)}px`,
                height: `${Math.round(height)}px`,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 3000,
              };
              return (
                <div
                  className={`powerup-anim powerup-${activeAnim.powerup}`}
                  style={animStyle}
                >
                  <img
                    src={activeAnim.img || helpAnims[activeAnim.powerup]}
                    alt={activeAnim.powerup}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              );
            })()}

          {fallAnim && fallingChip && (
            <div
              style={{
                position: "absolute",
                left:
                  Math.round(
                    fallAnim.left +
                      (fallAnim.width < fallAnim.cellW
                        ? (fallAnim.cellW - fallAnim.width) / 2
                        : 0)
                  ) + "px",
                top: Math.round(fallAnim.top) + "px",
                width: Math.round(fallAnim.width) + "px",
                height: Math.round(fallAnim.height) + "px",
                transition: "top 600ms cubic-bezier(.2,.8,.2,1)",
                zIndex: 3500,
                pointerEvents: "none",
              }}
              onTransitionEnd={() => {
                const { col, toRow, color, powerup } = fallingChip;
                const newBoard = board.map((r) => r.slice());
                if (powerup === "brick") {
                  newBoard[toRow][col] = { color, brick: true };
                  setAvailable((prev) => ({
                    ...prev,
                    [color]: { ...prev[color], brick: false },
                  }));
                } else newBoard[toRow][col] = { color };
                const found = findWinner(newBoard);
                setBoard(newBoard);
                if (found) {
                  setWinner(found.winner);
                  setWinningLine(found.line);
                  setTimeout(() => resetGame(), 1800);
                } else
                  setCurrent((prev) => (prev === "red" ? "yellow" : "red"));
                setFallingChip(null);
                setFallAnim(null);
                setSelectedPowerup(null);
              }}
            >
              <div style={{ width: "100%", height: "100%" }}>
                <Chip
                  value={fallingChip.color}
                  powerup={fallingChip.powerup === "brick" ? "brick" : null}
                />
              </div>
            </div>
          )}

          {anvilAnim && boardRect.w > 0 && (
            <div
              onTransitionEnd={(e) => {
                if (!anvilAnim) return;
                const prop = e.propertyName;
                if (anvilAnim.stage === "move" && prop === "left") {
                  const falling = new URL(
                    "../assets/Board/Animation/Anvil/Anvil_Falling.gif",
                    import.meta.url
                  ).href;
                  const explodeRed = new URL(
                    "../assets/Board/Animation/Anvil/Exploding_Red.gif",
                    import.meta.url
                  ).href;
                  const explodeYellow = new URL(
                    "../assets/Board/Animation/Anvil/Exploding_Yellow.gif",
                    import.meta.url
                  ).href;
                  const gridLeftPx = GRID.leftPct * boardRect.w;
                  const gridTopPx = GRID.topPct * boardRect.h;
                  const gridWidth =
                    boardRect.w * (1 - GRID.leftPct - GRID.rightPct);
                  const gridHeight =
                    boardRect.h * (1 - GRID.topPct - GRID.bottomPct);
                  const cellW = gridWidth / COLS;
                  const cellH = gridHeight / ROWS;
                  const impactRow = anvilAnim.row;
                  const c = anvilAnim.col;
                  const hit = board[impactRow] && board[impactRow][c];
                  let overlayImg = null;
                  if (hit && hit.color === "red") overlayImg = explodeRed;
                  else if (hit && hit.color === "yellow")
                    overlayImg = explodeYellow;
                  const cellAdj = (perCellAdjust[impactRow] || [])[c] || {
                    dx: 0,
                    dy: 0,
                    scale: 1,
                  };
                  const cellLeftPx = gridLeftPx + c * cellW + (cellAdj.dx || 0);
                  const cellTopPx =
                    gridTopPx + impactRow * cellH + (cellAdj.dy || 0);
                  const newW = Math.round(cellW * (cellAdj.scale || 1));
                  const newH = Math.round(cellH * (cellAdj.scale || 1));
                  const leftAdj = Math.round(cellLeftPx + (cellW - newW) / 2);
                  const topAdj = Math.round(cellTopPx + (cellH - newH) / 2);
                  setAnvilAnim((s) =>
                    s
                      ? {
                          ...s,
                          stage: "fall",
                          img: falling,
                          overlayImg,
                          overlayLeft: leftAdj,
                          overlayTop: topAdj,
                          overlayWidth: newW,
                          overlayHeight: newH,
                          top: s.endTop,
                        }
                      : s
                  );
                }
                if (anvilAnim.stage === "fall" && prop === "top") {
                  const impactRow = anvilAnim.row;
                  const c = anvilAnim.col;
                  const color = anvilAnim.color;
                  const newBoard = board.map((r) => r.slice());
                  applyPowerup(newBoard, impactRow, c, color, "anvil");
                  setAvailable((prev) => ({
                    ...prev,
                    [color]: { ...prev[color], anvil: false },
                  }));
                  const found = findWinner(newBoard);
                  setBoard(newBoard);
                  if (found) {
                    setWinner(found.winner);
                    setWinningLine(found.line);
                  } else
                    setCurrent((prev) => (prev === "red" ? "yellow" : "red"));
                  setTimeout(() => setAnvilAnim(null), 700);
                  setSelectedPowerup(null);
                }
              }}
              style={{
                position: "absolute",
                left: Math.round(anvilAnim.left) + "px",
                top: Math.round(anvilAnim.top) + "px",
                width: Math.round(anvilAnim.width) + "px",
                height: Math.round(anvilAnim.height) + "px",
                transition:
                  anvilAnim.stage === "move"
                    ? "left 700ms ease"
                    : anvilAnim.stage === "fall"
                    ? "top 1400ms cubic-bezier(.2,.8,.2,1)"
                    : "none",
                zIndex: 3600,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={anvilAnim.img}
                alt="anvil"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
              {anvilAnim.overlayImg && (
                <img
                  src={anvilAnim.overlayImg}
                  alt="anvil-explode"
                  style={{
                    position: "absolute",
                    left: Math.round(anvilAnim.overlayLeft) + "px",
                    top: Math.round(anvilAnim.overlayTop) + "px",
                    width: Math.round(anvilAnim.overlayWidth) + "px",
                    height: Math.round(anvilAnim.overlayHeight) + "px",
                    pointerEvents: "none",
                    zIndex: 4600,
                  }}
                />
              )}
            </div>
          )}

          <img
            src={boardFrontImg}
            alt="board front"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "auto",
              zIndex: 4000,
              pointerEvents: "none",
            }}
          />
        </div>
        <div className="sidebar-right arcade-side">
          <div className="sidebar-art">
            <img src={yellowSidebarImg} alt="yellow sidebar" />
            <div className="sidebar-powerups overlay-right">
              <button
                className="powerup-small"
                disabled={!available.yellow.anvil || current !== "yellow"}
                onClick={() =>
                  setSelectedPowerup((s) => (s === "anvil" ? null : "anvil"))
                }
                style={{ opacity: selectedPowerup === "anvil" ? 0.25 : 1 }}
              >
                <img
                  src={
                    new URL(
                      "../assets/Board/Construction/Button_Anvil_Yellow.png",
                      import.meta.url
                    ).href
                  }
                  alt="anvil"
                />
              </button>
              <button
                className="powerup-small"
                disabled={!available.yellow.lightning || current !== "yellow"}
                onClick={() =>
                  setSelectedPowerup((s) =>
                    s === "lightning" ? null : "lightning"
                  )
                }
                style={{ opacity: selectedPowerup === "lightning" ? 0.25 : 1 }}
              >
                <img
                  src={
                    new URL(
                      "../assets/Board/Construction/Button_Lightning_Yellow.png",
                      import.meta.url
                    ).href
                  }
                  alt="lightning"
                />
              </button>
              <button
                className="powerup-small"
                disabled={!available.yellow.brick || current !== "yellow"}
                onClick={() =>
                  setSelectedPowerup((s) => (s === "brick" ? null : "brick"))
                }
                style={{ opacity: selectedPowerup === "brick" ? 0.25 : 1 }}
              >
                <img
                  src={
                    new URL(
                      "../assets/Board/Construction/Button_Brick_Yellow.png",
                      import.meta.url
                    ).href
                  }
                  alt="brick"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
      ``
    </div>
  );
}
