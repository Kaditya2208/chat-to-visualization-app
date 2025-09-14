import React, { useRef, useEffect, useState } from "react";

const VisualizationCanvas = ({ visualization, isDarkMode = false, toggleDarkMode }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);
  const lastTimeRef = useRef(0);
  const elapsedTimeRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");

  // Enhanced JSON extraction
  const tryExtractJSONFromString = (text) => {
    if (typeof text !== "string") return null;
    
    // Try to find JSON blocks in various formats
    const patterns = [
      /```json\s*(\{[\s\S]*?\})\s*```/i,
      /```\s*(\{[\s\S]*?\})\s*```/,
      /(\{[\s\S]*?\})/,
      /(\[[\s\S]*?\])/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch (e) {
          continue;
        }
      }
    }

    // Fallback to original method
    const firstPos = Math.min(
      ...["{", "["]
        .map((c) => text.indexOf(c))
        .filter((idx) => idx >= 0)
    );
    
    if (firstPos === -1) return null;

    for (let end = firstPos + 1; end <= text.length; end++) {
      const candidate = text.slice(firstPos, end);
      try {
        return JSON.parse(candidate);
      } catch (e) {
        continue;
      }
    }
    return null;
  };

  // Enhanced normalization with better error handling
  const normalizeVisualization = (input) => {
    try {
      if (!input) return null;

      let obj = input;
      let debugPath = "input: " + typeof input;

      // Handle string input
      if (typeof obj === "string") {
        debugPath += " -> string";
        try {
          obj = JSON.parse(obj);
          debugPath += " -> parsed JSON";
        } catch {
          const extracted = tryExtractJSONFromString(obj);
          if (extracted) {
            obj = extracted;
            debugPath += " -> extracted JSON";
          } else {
            return null;
          }
        }
      }

      // Handle wrapped formats
      if (obj && typeof obj === "object") {
        if (obj.visualization) {
          obj = obj.visualization;
          debugPath += " -> unwrapped .visualization";
        } else if (obj.answer && obj.answer.visualization) {
          obj = obj.answer.visualization;
          debugPath += " -> unwrapped .answer.visualization";
        }
      }

      setDebugInfo(debugPath);

      // Handle array of layers
      if (Array.isArray(obj)) {
        return { 
          duration: obj.duration || 5000, 
          layers: obj.map(layer => typeof layer === 'object' ? layer : { type: 'rect', props: layer })
        };
      }

      // Handle single layer
      if (obj && obj.type) {
        return { duration: obj.duration || 5000, layers: [obj] };
      }

      // Handle already normalized
      if (obj && obj.layers && Array.isArray(obj.layers)) {
        return { 
          duration: obj.duration || 5000, 
          layers: obj.layers.filter(layer => layer && typeof layer === 'object')
        };
      }

      return null;
    } catch (error) {
      console.error("Normalization error:", error);
      setDebugInfo("Error: " + error.message);
      return null;
    }
  };

  const normalizedRef = useRef(null);

  useEffect(() => {
    const norm = normalizeVisualization(visualization);
    normalizedRef.current = norm;
    
    if (norm && Array.isArray(norm.layers) && norm.layers.length > 0) {
      setUsingDemo(false);
      elapsedTimeRef.current = 0;
      lastTimeRef.current = 0;
      console.log("Loaded visualization with", norm.layers.length, "layers");
    } else {
      setUsingDemo(true);
      elapsedTimeRef.current = 0;
      lastTimeRef.current = 0;
      console.log("Using demo - no valid visualization found");
    }
  }, [visualization]);

  // Canvas setup with better error handling
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const applySize = () => {
      try {
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        const cssW = Math.max(100, Math.floor(rect.width));
        const cssH = Math.max(100, Math.floor(rect.height));
        const backingW = Math.floor(cssW * dpr);
        const backingH = Math.floor(cssH * dpr);

        canvas.width = backingW;
        canvas.height = backingH;
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;

        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } catch (error) {
        console.error("Canvas resize error:", error);
      }
    };

    applySize();
    
    const ro = new ResizeObserver(applySize);
    ro.observe(container);
    window.addEventListener("resize", applySize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", applySize);
    };
  }, []);

  const getCurrentProps = (layer) => {
    const original = layer.props ? { ...layer.props } : { ...layer };
    const props = { ...original };

    if (layer.animations && Array.isArray(layer.animations)) {
      const t = elapsedTimeRef.current;
      layer.animations.forEach((anim) => {
        const start = Number(anim.start || 0);
        const end = Number(anim.end || start + 1000);
        const dur = end - start;
        
        if (t >= start && t <= end && dur > 0) {
          const p = Math.min(1, Math.max(0, (t - start) / dur));
          const from = Number(anim.from ?? 0);
          const to = Number(anim.to ?? from);
          props[anim.property] = from + (to - from) * p;
        } else if (t > end) {
          props[anim.property] = anim.to;
        }
      });
    }

    return props;
  };

  const drawShape = (ctx, layer) => {
    if (!layer || !layer.type) return;
    
    try {
      const props = getCurrentProps(layer);
      const defaultFill = isDarkMode ? "#e0e0e0" : "#333";
      const defaultStroke = isDarkMode ? "#888" : "#777";

      ctx.save();
      
      // Handle positioning
      if (props.x !== undefined || props.y !== undefined) {
        ctx.translate(props.x || 0, props.y || 0);
      }

      ctx.globalAlpha = props.opacity !== undefined ? props.opacity : 1;

      switch (layer.type) {
        case "rect":
          ctx.fillStyle = props.fill || defaultFill;
          ctx.fillRect(0, 0, props.width || 50, props.height || 50);
          if (props.stroke) {
            ctx.strokeStyle = props.stroke;
            ctx.lineWidth = props.strokeWidth || 1;
            ctx.strokeRect(0, 0, props.width || 50, props.height || 50);
          }
          break;

        case "circle":
          ctx.beginPath();
          ctx.arc(0, 0, props.r || props.radius || 20, 0, Math.PI * 2);
          ctx.fillStyle = props.fill || defaultFill;
          ctx.fill();
          if (props.stroke) {
            ctx.strokeStyle = props.stroke;
            ctx.lineWidth = props.strokeWidth || 1;
            ctx.stroke();
          }
          break;

        case "line":
          ctx.beginPath();
          ctx.moveTo(props.x1 || 0, props.y1 || 0);
          ctx.lineTo(props.x2 || props.x || 100, props.y2 || props.y || 100);
          ctx.strokeStyle = props.stroke || defaultStroke;
          ctx.lineWidth = props.strokeWidth || 2;
          ctx.stroke();
          break;

        case "text":
        case "label":
          const textContent = props.content || props.text || props.label || "Text";
          ctx.fillStyle = props.fill || defaultFill;
          const fontSize = props.fontSize || props["font-size"] || 16;
          ctx.font = `${fontSize}px ${props.fontFamily || 'Arial'}`;
          ctx.textAlign = props.textAlign || "center";
          ctx.textBaseline = props.textBaseline || "middle";
          ctx.fillText(textContent, 0, 0);
          break;

        default:
          // Draw a placeholder for unknown types
          ctx.fillStyle = isDarkMode ? "#666" : "#ccc";
          ctx.fillRect(-10, -10, 20, 20);
          break;
      }

      ctx.restore();
    } catch (error) {
      console.warn("Error drawing shape:", error, layer);
    }
  };

  const drawDemo = (ctx, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width || 400;
    const cssH = rect.height || 300;

    const t = elapsedTimeRef.current || 0;
    const duration = 3000;
    const progress = (t % duration) / duration;
    
    // Moving circle
    const margin = 50;
    const x = progress * Math.max(0, cssW - margin * 2) + margin;
    const y = cssH / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fillStyle = isDarkMode ? "#4ade80" : "#22c55e";
    ctx.fill();

    // Demo label
    ctx.fillStyle = isDarkMode ? "#e0e0e0" : "#333";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Demo Animation", cssW / 2, cssH - 60);
    
    if (debugInfo) {
      ctx.font = "12px monospace";
      ctx.fillText("Debug: " + debugInfo, cssW / 2, cssH - 40);
    }
    
    ctx.restore();
  };

  // Animation loop
  useEffect(() => {
    let running = true;

    const step = (timestamp) => {
      if (!running) return;

      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (isPlaying) {
        elapsedTimeRef.current += delta;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        if (isPlaying) {
          animationFrameId.current = requestAnimationFrame(step);
        }
        return;
      }

      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      if (usingDemo || !normalizedRef.current) {
        drawDemo(ctx, canvas);
      } else {
        const vis = normalizedRef.current;
        const duration = vis.duration || 5000;
        
        // Loop animation
        if (duration && elapsedTimeRef.current > duration) {
          elapsedTimeRef.current = elapsedTimeRef.current % duration;
        }

        // Draw all layers
        vis.layers.forEach((layer, index) => {
          try {
            drawShape(ctx, layer);
          } catch (error) {
            console.warn(`Error drawing layer ${index}:`, error);
          }
        });
      }

      if (isPlaying) {
        animationFrameId.current = requestAnimationFrame(step);
      }
    };

    if (isPlaying) {
      animationFrameId.current = requestAnimationFrame(step);
    }

    return () => {
      running = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPlaying, usingDemo, isDarkMode]);

  // Test with sample data
  const testVisualization = () => {
    const sampleViz = {
      duration: 4000,
      layers: [
        {
          type: "rect",
          props: {
            x: 100,
            y: 100,
            width: 100,
            height: 50,
            fill: "#3b82f6"
          },
          animations: [
            {
              property: "x",
              start: 0,
              end: 2000,
              from: 100,
              to: 300
            }
          ]
        },
        {
          type: "circle",
          props: {
            x: 200,
            y: 200,
            radius: 30,
            fill: "#ef4444"
          }
        },
        {
          type: "text",
          props: {
            x: 200,
            y: 250,
            content: "Test Visualization",
            fontSize: 18
          }
        }
      ]
    };
    
    // Simulate receiving this data
    normalizedRef.current = sampleViz;
    setUsingDemo(false);
    elapsedTimeRef.current = 0;
    lastTimeRef.current = 0;
    setIsPlaying(true);
  };

  const handleToggleDarkMode = () => {
    if (toggleDarkMode) {
      toggleDarkMode();
    } else {
      // If no toggle function provided, we can't change the mode
      console.log("No toggleDarkMode function provided");
    }
  };

  return (
    <div className="canvas-wrapper" style={{
      width: '100%',
      height: '400px',
      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: isDarkMode ? '#111827' : '#ffffff',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div 
        ref={containerRef} 
        className="canvas-container"
        style={{
          flex: 1,
          position: 'relative',
          minHeight: 0
        }}
      >
        <canvas 
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />
      </div>

      <div 
        className="controls"
        style={{
          padding: '12px 16px',
          borderTop: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
          backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setIsPlaying(p => !p)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {isPlaying ? "⏸️ Pause" : "▶️ Play"}
          </button>
          
          <button 
            onClick={handleToggleDarkMode}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {isDarkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
          
          <button 
            onClick={() => {
              console.log("🔍 DEBUGGING VISUALIZATION DATA:");
              console.log("Raw prop:", visualization);
              console.log("Type:", typeof visualization);
              console.log("Normalized:", normalizedRef.current);
              alert("Check the browser console for detailed visualization data");
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            🐛 Debug
          </button>
        </div>
        
        <div style={{
          fontSize: '12px',
          color: isDarkMode ? '#9ca3af' : '#6b7280'
        }}>
          Status: {usingDemo ? "Demo" : "Visualization"} | Playing: {isPlaying ? "Yes" : "No"}
        </div>
      </div>
      
      {debugInfo && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: isDarkMode ? '#451a03' : '#fef3c7',
          color: isDarkMode ? '#fbbf24' : '#92400e',
          fontSize: '11px',
          fontFamily: 'monospace',
          borderTop: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`
        }}>
          Debug: {debugInfo}
        </div>
      )}
    </div>
  );
};

export default VisualizationCanvas;