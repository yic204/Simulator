/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { motion, useAnimation, useSpring, useMotionValue } from "motion/react";
import { Thermometer, Activity, RefreshCw } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";

interface LabEquipmentProps {
  volumeAdded: number; // in mL
  currentPh: number;
  currentConductivity: number; // in uS/cm
  temperature: number; // °C
  indicatorColor: string; // Hex color
  isSimulating: boolean;
  isArabic: boolean;
  stirrerSpeed: number; // 0 to 100
  onDropComplete?: () => void;
  dropVolume: number;
  pourSpeed: number;
  triggerDropCount: number;
  onDropImpact: (volume: number) => void;
  onTriggerManualDrop?: (count: number) => void;
  onStirrerSpeedChange?: (speed: number) => void;
}

const easeOutBack = (x: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

const easeOutBounce = (x: number): number => {
  const n1 = 7.5625;
  const d1 = 2.75;
  let t = x;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

export const LabEquipment: React.FC<LabEquipmentProps> = React.memo(({
  volumeAdded,
  currentPh,
  currentConductivity,
  temperature,
  indicatorColor,
  isSimulating,
  isArabic,
  stirrerSpeed,
  onDropComplete,
  dropVolume,
  pourSpeed,
  triggerDropCount,
  onDropImpact,
  onTriggerManualDrop,
  onStirrerSpeedChange,
}) => {
  // High performance Refs for 120 FPS direct DOM rendering
  const liquidBodyRef = useRef<SVGPathElement>(null);
  const liquidSurfaceRef = useRef<SVGPathElement>(null);
  const liquidMaskPathRef = useRef<SVGPathElement>(null);
  const vortexCoreRef = useRef<SVGPathElement>(null);
  const stirBarRef = useRef<SVGGElement>(null);
  const stopcockRef = useRef<SVGGElement>(null);
  const stirBarAngleRef = useRef(0);
  const wavePhaseRef = useRef(0);
  const surfaceOscillationRef = useRef(0);
  const surfaceOscVelocityRef = useRef(0);
  const volumeVelocityRef = useRef(0);
  const oscillationStartRef = useRef<number | null>(null);
  
  const dropletRef = useRef<SVGPathElement>(null);
  const rippleRef = useRef<SVGEllipseElement>(null);
  const splashLeftRef = useRef<SVGCircleElement>(null);
  const splashRightRef = useRef<SVGCircleElement>(null);
  const splashCenterRef = useRef<SVGCircleElement>(null);
  const dropletAgeRef = useRef(0);
  const rippleAgeRef = useRef<number | null>(null);

  // Droplet queue refs
  const dropQueueRef = useRef<number[]>([]);
  const currentDropVolumeRef = useRef<number | null>(null);
  const currentDropTimeRef = useRef(0);
  const impactTriggeredRef = useRef(false);
  const dripPauseTimerRef = useRef(0);

  const volumeRef = useRef(volumeAdded);
  const isSimulatingRef = useRef(isSimulating);
  const stirrerSpeedRef = useRef(stirrerSpeed);
  const pourSpeedRef = useRef(pourSpeed);
  const dropVolumeRef = useRef(dropVolume);
  const interpolatedVolumeRef = useRef(volumeAdded);

  useEffect(() => {
    volumeRef.current = volumeAdded;
  }, [volumeAdded]);

  useEffect(() => {
    isSimulatingRef.current = isSimulating;
  }, [isSimulating]);

  useEffect(() => {
    stirrerSpeedRef.current = stirrerSpeed;
  }, [stirrerSpeed]);

  useEffect(() => {
    pourSpeedRef.current = pourSpeed;
  }, [pourSpeed]);

  useEffect(() => {
    dropVolumeRef.current = dropVolume;
  }, [dropVolume]);

  const prevTriggerCountRef = useRef(triggerDropCount);
  useEffect(() => {
    if (triggerDropCount > prevTriggerCountRef.current) {
      const count = triggerDropCount - prevTriggerCountRef.current;
      prevTriggerCountRef.current = triggerDropCount;
      for (let i = 0; i < count; i++) {
        dropQueueRef.current.push(dropVolumeRef.current);
      }
    }
  }, [triggerDropCount]);

  useEffect(() => {
    if (volumeAdded === 0) {
      dropQueueRef.current = [];
      currentDropVolumeRef.current = null;
      currentDropTimeRef.current = 0;
      impactTriggeredRef.current = false;
      dripPauseTimerRef.current = 0;
      if (dropletRef.current) {
        dropletRef.current.setAttribute("opacity", "0");
      }
      if (stopcockRef.current) {
        stopcockRef.current.setAttribute("transform", "rotate(0, 150, 246)");
      }
    }
  }, [volumeAdded]);

  const handleStopcockClick = () => {
    if (onTriggerManualDrop) {
      onTriggerManualDrop(1);
    }
  };

  // Mouse move reflection tracking using Framer Motion's springs for physical inertia
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);
  const springConfig = { damping: 40, stiffness: 200 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const [bgStyle, setBgStyle] = useState({
    background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 50%), rgba(10, 10, 12, 0.45)"
  });

  useEffect(() => {
    const unsubscribeX = smoothX.on("change", (x) => {
      setBgStyle({
        background: `radial-gradient(circle at ${x}% ${smoothY.get()}%, rgba(255,255,255,0.07) 0%, transparent 50%), rgba(10, 10, 12, 0.45)`
      });
    });
    const unsubscribeY = smoothY.on("change", (y) => {
      setBgStyle({
        background: `radial-gradient(circle at ${smoothX.get()}% ${y}%, rgba(255,255,255,0.07) 0%, transparent 50%), rgba(10, 10, 12, 0.45)`
      });
    });
    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [smoothX, smoothY]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    mouseX.set(x);
    mouseY.set(y);
  };

  const [rippleActive, setRippleActive] = useState(false);

  // Class A volumetric burette graduation marks calculations
  const buretteTicks = React.useMemo(() => {
    const ticks = [];
    // 0 to 50 mL marks (25px to 225px, 4px per mL)
    for (let mL = 0; mL <= 50; mL++) {
      const yPos = 25 + mL * 4;
      
      if (mL % 10 === 0) {
        ticks.push({
          mL,
          yPos,
          x1: 144,
          x2: 151,
          stroke: "rgba(255, 255, 255, 0.85)",
          strokeWidth: 0.8,
          showText: true,
          fontSize: 6.5,
          fontWeight: "bold",
        });
      } else if (mL % 5 === 0) {
        ticks.push({
          mL,
          yPos,
          x1: 144,
          x2: 149,
          stroke: "rgba(255, 255, 255, 0.65)",
          strokeWidth: 0.65,
          showText: true,
          fontSize: 5.5,
          fontWeight: "normal",
        });
      } else {
        ticks.push({
          mL,
          yPos,
          x1: 144,
          x2: 147,
          stroke: "rgba(255, 255, 255, 0.4)",
          strokeWidth: 0.5,
          showText: false,
        });
      }

      // 0.1 mL micro subdivisions (only render between mL marks)
      if (mL < 50) {
        for (let sub = 1; sub <= 9; sub++) {
          const subY = yPos + sub * 0.4;
          const isHalf = sub === 5;
          ticks.push({
            mL: mL + sub * 0.1,
            yPos: subY,
            x1: 144,
            x2: isHalf ? 146 : 145,
            stroke: isHalf ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.2)",
            strokeWidth: 0.3,
            showText: false,
          });
        }
      }
    }
    return ticks;
  }, []);

  // Calculate the level of titrant in the burette
  // Burette capacity is usually 50mL.
  const buretteCapacity = 50;
  const titrantRemaining = Math.max(0, buretteCapacity - (volumeAdded % buretteCapacity));
  const buretteLiquidHeight = (titrantRemaining / buretteCapacity) * 160; // scale to 160px max height in SVG
  const liquidTopY = 25 + ((volumeAdded % buretteCapacity) / buretteCapacity) * 200;
  const liquidHeight = Math.max(0, 240 - liquidTopY);

  // We'll calculate flask metrics dynamically inside the RAF loop for 100% smooth level rising.
  const initialFlaskVolumeHeight = 35;
  const initialAddHeight = Math.min(25, (volumeAdded / 100) * 25);
  const initialTopY = 338 - (initialFlaskVolumeHeight + initialAddHeight);
  const initialLeftX = 136 - 0.6207 * (initialTopY - 280);
  const initialRightX = 164 + 0.6207 * (initialTopY - 280);

  // Buttery-smooth high-performance animation loop (up to 120 FPS)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const tick = (time: number) => {
      const delta = Math.min(0.05, (time - lastTime) / 1000); // limit delta to prevent large jumps on tab switch
      lastTime = time;

      // 1. Spring-based interpolation for flask volume level (physical spring-mass-damper)
      const targetVolume = volumeRef.current;
      const volDiff = interpolatedVolumeRef.current - targetVolume;
      
      const VOL_STIFFNESS = 95.0;
      const VOL_DAMPING = 16.0;
      
      const volForce = -VOL_STIFFNESS * volDiff;
      const volDamping = -VOL_DAMPING * volumeVelocityRef.current;
      const volAcc = volForce + volDamping;
      
      volumeVelocityRef.current += volAcc * delta;
      interpolatedVolumeRef.current += volumeVelocityRef.current * delta;
      
      // Guard boundaries to prevent extreme values on initialization
      if (isNaN(interpolatedVolumeRef.current)) {
        interpolatedVolumeRef.current = targetVolume;
        volumeVelocityRef.current = 0;
      }

      // 2. Compute geometry metrics based on interpolated volume
      const currentFlaskLiquidHeight = 35 + Math.min(25, (interpolatedVolumeRef.current / 100) * 25);
      const currentTopY = 338 - currentFlaskLiquidHeight;
      const currentLeftX = 136 - 0.6207 * (currentTopY - 280);
      const currentRightX = 164 + 0.6207 * (currentTopY - 280);

      // 3. Advance wave phase
      wavePhaseRef.current = (wavePhaseRef.current + delta * 8) % (Math.PI * 2);
      const speed = stirrerSpeedRef.current;
      const currentVortexDepth = speed > 0 ? 1.5 + (speed / 100) * 4.5 : 1.5;
      const waveOffset = (speed > 0 ? 0.8 : 0.2) * Math.sin(wavePhaseRef.current) * 1.0;

      // 4. Spring-based surface oscillation update (subtle inertia-based oscillation)
      const OSC_STIFFNESS = 160.0;
      const OSC_DAMPING = 12.0;
      
      const oscDiff = surfaceOscillationRef.current - 0; // target is 0 rest state
      const oscForce = -OSC_STIFFNESS * oscDiff;
      const oscDamping = -OSC_DAMPING * surfaceOscVelocityRef.current;
      const oscAcc = oscForce + oscDamping;
      
      surfaceOscVelocityRef.current += oscAcc * delta;
      surfaceOscillationRef.current += surfaceOscVelocityRef.current * delta;
      
      // Decay slightly the velocity to guarantee settlement to 0
      surfaceOscVelocityRef.current *= 0.99;
      
      if (isNaN(surfaceOscillationRef.current)) {
        surfaceOscillationRef.current = 0;
        surfaceOscVelocityRef.current = 0;
      }
      const currentOsc = surfaceOscillationRef.current;

      // 5. Directly update the liquid mask and top surface paths
      if (liquidMaskPathRef.current) {
        const maskD = `
          M ${currentLeftX} ${currentTopY + currentOsc}
          Q 150 ${currentTopY + currentVortexDepth + waveOffset + currentOsc} ${currentRightX} ${currentTopY + currentOsc}
          L 210 350
          L 90 350
          Z
        `;
        liquidMaskPathRef.current.setAttribute("d", maskD);
      }

      const surfaceD = `M ${currentLeftX},${currentTopY + currentOsc} Q 150,${currentTopY + currentVortexDepth + waveOffset + currentOsc} ${currentRightX},${currentTopY + currentOsc}`;

      if (liquidSurfaceRef.current) {
        liquidSurfaceRef.current.setAttribute("d", surfaceD);
      }

      // 6. Unified Droplet Queue Processor
      const currentSpeedMode = pourSpeedRef.current;
      let animSpeed = 1.0;
      let dripPauseDuration = 0.0;
      let currentDropSize = dropVolumeRef.current;

      if (currentSpeedMode === 2) {
        animSpeed = 1.8;
        currentDropSize = 0.20; // 0.20 mL for Fast mode
      } else if (currentSpeedMode === 3) {
        animSpeed = 1.0;
        dripPauseDuration = 0.45;
      }

      const VALVE_OPEN_DURATION = 0.10 / animSpeed; // 100ms
      const VALVE_HOLD_DURATION = 0.10 / animSpeed; // 100ms
      const VALVE_CLOSE_DURATION = 0.10 / animSpeed; // 100ms
      const DROP_GROW_DURATION = VALVE_OPEN_DURATION + VALVE_HOLD_DURATION; // 200ms
      const DROP_FALL_DURATION = 0.30 / animSpeed; // 300ms
      const TOTAL_DROP_DURATION = DROP_GROW_DURATION + DROP_FALL_DURATION; // 500ms

      if (dripPauseTimerRef.current > 0) {
        dripPauseTimerRef.current -= delta;
      }

      // Check if we need to start a new drop
      if (currentDropVolumeRef.current === null && dripPauseTimerRef.current <= 0) {
        if (dropQueueRef.current.length > 0) {
          currentDropVolumeRef.current = dropQueueRef.current.shift() || null;
          currentDropTimeRef.current = 0;
          impactTriggeredRef.current = false;
        } else if (isSimulatingRef.current) {
          currentDropVolumeRef.current = currentDropSize;
          currentDropTimeRef.current = 0;
          impactTriggeredRef.current = false;
        }
      }

      // Animate current active drop
      if (currentDropVolumeRef.current !== null) {
        currentDropTimeRef.current += delta;
        const elapsed = currentDropTimeRef.current;

        // Animate stopcock/valve rotation using easeOutBack (open) and easeOutBounce (close)
        let stopcockAngle = 0;
        if (elapsed < VALVE_OPEN_DURATION) {
          const p = elapsed / VALVE_OPEN_DURATION;
          stopcockAngle = 75 * easeOutBack(p);
        } else if (elapsed < DROP_GROW_DURATION) {
          stopcockAngle = 75;
        } else if (elapsed < DROP_GROW_DURATION + VALVE_CLOSE_DURATION) {
          const pClose = (elapsed - DROP_GROW_DURATION) / VALVE_CLOSE_DURATION;
          stopcockAngle = 75 * (1 - easeOutBounce(pClose));
        } else {
          stopcockAngle = 0;
        }

        if (stopcockRef.current) {
          stopcockRef.current.style.transform = `rotate(${stopcockAngle}deg)`;
        }

        // Animate droplet path
        if (dropletRef.current) {
          let opacity = 0;
          let dropletPath = "";

          if (elapsed < DROP_GROW_DURATION) {
            // Growing phase
            const p = elapsed / DROP_GROW_DURATION;
            const r = 0.5 + 1.7 * p;
            const cy = 274 + 3 * p;
            const stretch = 1.0 + 0.3 * p;
            opacity = p;

            const rx = r / Math.sqrt(stretch);
            const ry = r * stretch;
            dropletPath = `
              M 150 ${cy - ry}
              C ${150 - rx * 0.3} ${cy - ry * 0.4} ${150 - rx} ${cy} 150 ${cy + ry}
              C ${150 + rx} ${cy} ${150 + rx * 0.3} ${cy - ry * 0.4} 150 ${cy - ry}
              Z
            `;
          } else if (elapsed < TOTAL_DROP_DURATION) {
            // Falling phase (with physical acceleration under gravity)
            const p = (elapsed - DROP_GROW_DURATION) / DROP_FALL_DURATION;
            const startY = 277;
            const endY = currentTopY - 4;
            const cy = startY + (endY - startY) * (p * p);
            const r = 2.2;
            const stretch = 1.3 + 0.7 * Math.sin(p * Math.PI);
            opacity = 1.0;

            const rx = r / Math.sqrt(stretch);
            const ry = r * stretch;
            dropletPath = `
              M 150 ${cy - ry}
              C ${150 - rx * 0.3} ${cy - ry * 0.4} ${150 - rx} ${cy} 150 ${cy + ry}
              C ${150 + rx} ${cy} ${150 + rx * 0.3} ${cy - ry * 0.4} 150 ${cy - ry}
              Z
            `;
          } else {
            opacity = 0;
          }

          if (dropletPath) {
            dropletRef.current.setAttribute("d", dropletPath);
          }
          dropletRef.current.setAttribute("opacity", opacity.toString());
        }

        // Impact trigger
        if (elapsed >= TOTAL_DROP_DURATION) {
          if (!impactTriggeredRef.current) {
            impactTriggeredRef.current = true;
            const activeVol = currentDropVolumeRef.current;
            if (onDropImpact) {
              onDropImpact(activeVol);
            }
            rippleAgeRef.current = 0;
            surfaceOscVelocityRef.current = -38.0;
            volumeVelocityRef.current += 1.5;
            if (onDropComplete) {
              onDropComplete();
            }
          }
        }

        // Completion phase
        if (elapsed >= TOTAL_DROP_DURATION + 0.15) {
          currentDropVolumeRef.current = null;
          impactTriggeredRef.current = false;
          dripPauseTimerRef.current = dripPauseDuration;
        }
      } else {
        if (dropletRef.current) {
          dropletRef.current.setAttribute("opacity", "0");
        }
        if (stopcockRef.current) {
          stopcockRef.current.style.transform = "rotate(0deg)";
        }
      }

      // 7. Ripple & Splash direct rendering (180ms exactly)
      if (rippleAgeRef.current !== null) {
        rippleAgeRef.current += delta;
        const rAge = rippleAgeRef.current;
        const RIPPLE_DURATION = 0.18; // 180ms
        if (rAge < RIPPLE_DURATION) {
          const progress = rAge / RIPPLE_DURATION;
          // Ripple expands and fades
          const rx = 1 + 15 * progress;
          const ry = 0.3 + 4.2 * progress;
          const op = 1 - progress;

          if (rippleRef.current) {
            rippleRef.current.setAttribute("rx", rx.toString());
            rippleRef.current.setAttribute("ry", ry.toString());
            rippleRef.current.setAttribute("cy", currentTopY.toString());
            rippleRef.current.setAttribute("opacity", op.toString());
          }

          // Splash droplets (quadratic physical arcs)
          const pSp = Math.min(1.0, rAge / (RIPPLE_DURATION * 0.9));
          const dxLeft = -6 * pSp;
          const dyLeft = -2 + (-12 * pSp) + (14 * pSp * pSp);
          const opLeft = 0.9 * (1 - pSp);

          if (splashLeftRef.current) {
            splashLeftRef.current.setAttribute("cx", (148 + dxLeft).toString());
            splashLeftRef.current.setAttribute("cy", (currentTopY + dyLeft).toString());
            splashLeftRef.current.setAttribute("opacity", opLeft.toString());
          }

          const dxRight = 6 * pSp;
          const dyRight = -2 + (-12 * pSp) + (14 * pSp * pSp);
          const opRight = 0.9 * (1 - pSp);

          if (splashRightRef.current) {
            splashRightRef.current.setAttribute("cx", (152 + dxRight).toString());
            splashRightRef.current.setAttribute("cy", (currentTopY + dyRight).toString());
            splashRightRef.current.setAttribute("opacity", opRight.toString());
          }

          // Central rebound drop
          const pRc = Math.min(1.0, rAge / (RIPPLE_DURATION * 0.95));
          const dyRc = -4 + (-14 * pRc) + (18 * pRc * pRc);
          const opRc = 0.9 * (1 - pRc);

          if (splashCenterRef.current) {
            splashCenterRef.current.setAttribute("cx", "150");
            splashCenterRef.current.setAttribute("cy", (currentTopY + dyRc).toString());
            splashCenterRef.current.setAttribute("opacity", opRc.toString());
          }
        } else {
          rippleAgeRef.current = null;
          if (rippleRef.current) rippleRef.current.setAttribute("opacity", "0");
          if (splashLeftRef.current) splashLeftRef.current.setAttribute("opacity", "0");
          if (splashRightRef.current) splashRightRef.current.setAttribute("opacity", "0");
          if (splashCenterRef.current) splashCenterRef.current.setAttribute("opacity", "0");
        }
      }

      // 8. Update realistic vortex core path inside liquid
      if (vortexCoreRef.current) {
        // Only shift when speed > 0
        const vTopX = 150 + (speed > 0 ? Math.sin(wavePhaseRef.current) * (speed / 100) * 1.5 : 0);
        const vBottomX = 150 + (speed > 0 ? Math.sin(wavePhaseRef.current - 1.2) * (speed / 100) * 0.8 : 0);
        const topW = 3 + (speed / 100) * 5;
        const bottomW = 1.5 + (speed / 100) * 2;
        
        const vD = `
          M ${vTopX - topW} ${currentTopY + currentOsc + 1}
          Q 150 ${currentTopY + currentVortexDepth + waveOffset + currentOsc} ${vTopX + topW} ${currentTopY + currentOsc + 1}
          L ${vBottomX + bottomW} 337
          Q 150 339.5 ${vBottomX - bottomW} 337
          Z
        `;
        vortexCoreRef.current.setAttribute("d", vD);
        vortexCoreRef.current.setAttribute("opacity", (speed > 0 ? 0.22 + (speed / 100) * 0.12 : 0.05).toString());
      }

      // 9. Update realistic PTFE magnetic stir bar rotation and fluid resistance wobble
      if (stirBarRef.current) {
        if (speed > 0) {
          // Cumulative rotation angle, proportional to stirrerSpeed
          stirBarAngleRef.current += delta * (speed * 0.12 + 2);
          
          // Smooth rotation (scaleX changes to simulate horizontal spin in front projection)
          const cosA = Math.cos(stirBarAngleRef.current);
          
          // 1-2 degrees of fluid resistance wobble
          const wobbleAngle = Math.sin(time * 0.01) * 1.2 + Math.sin(time * 0.035) * 0.6;
          
          stirBarRef.current.setAttribute(
            "transform",
            `translate(150, 337.5) rotate(${wobbleAngle}) scale(${cosA}, 1)`
          );
        } else {
          // Steady resting position when speed is 0
          stirBarRef.current.setAttribute(
            "transform",
            "translate(150, 337.5) rotate(0) scale(1, 1)"
          );
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [onDropComplete]);



  // Translate some labels
  const t = {
    burette: isArabic ? "سحاحة (٥٠ مل)" : "Burette (50 mL)",
    stirrer: isArabic ? "محرّك مغناطيسي" : "Magnetic Stirrer",
    phMeter: isArabic ? "مقياس الأس الهيدروجيني pH" : "Digital pH Meter",
    thermometer: isArabic ? "مقياس الحرارة" : "Thermometer",
    condMeter: isArabic ? "مقياس الموصلية" : "Conductivity",
    flask: isArabic ? "دورق مخروطي" : "Conical Flask",
    whiteTile: isArabic ? "لوح بورسلان أبيض" : "White Porcelain Tile",
    stirringSpeed: isArabic ? "سرعة التحريك:" : "Stirring Speed:",
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      style={bgStyle}
      className="flex flex-col items-center justify-center p-8 bg-zinc-950/45 backdrop-blur-2xl border border-white/10 rounded-[24px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] glass-layered-shadow w-full min-h-[720px] relative transition-all duration-300"
    >
      {/* Top Floating Digital Instrument Readouts */}
      <div className="grid grid-cols-3 gap-4 w-full mb-8 max-w-lg z-10">
        {/* pH Meter */}
        <div id="ph-display" className="bg-zinc-950/85 backdrop-blur-md text-emerald-400 font-mono p-4 rounded-xl border border-emerald-500/20 glass-glow-emerald lcd-scanline flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <span className="text-xs text-zinc-500 uppercase tracking-widest font-sans font-semibold mb-1">{t.phMeter}</span>
          <span className="text-3xl font-bold tracking-wider tabular-nums">
            <AnimatedNumber value={currentPh} precision={2} />
          </span>
        </div>

        {/* Conductivity */}
        <div id="cond-display" className="bg-zinc-950/85 backdrop-blur-md text-cyan-400 font-mono p-4 rounded-xl border border-cyan-500/20 glass-glow-cyan lcd-scanline flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <span className="text-xs text-zinc-500 uppercase tracking-widest font-sans font-semibold mb-1">{t.condMeter}</span>
          <span className="text-lg font-bold tracking-tight tabular-nums">
            {currentConductivity > 10000 ? (
              <>
                <AnimatedNumber value={currentConductivity / 1000} precision={2} /> mS
              </>
            ) : (
              <>
                <AnimatedNumber value={currentConductivity} precision={0} /> µS
              </>
            )}
          </span>
        </div>

        {/* Thermometer */}
        <div id="temp-display" className="bg-zinc-950/85 backdrop-blur-md text-amber-400 font-mono p-4 rounded-xl border border-amber-500/20 glass-glow-amber lcd-scanline flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <span className="text-xs text-zinc-500 uppercase tracking-widest font-sans font-semibold mb-1">{t.thermometer}</span>
          <span className="text-lg font-bold flex items-center gap-1 tabular-nums justify-center">
            <Thermometer className="w-5 h-5 text-amber-500" />
            <AnimatedNumber value={temperature} precision={1} />°C
          </span>
        </div>
      </div>

      {/* Main SVG Laboratory Apparatus (Centred Titrator Layout) */}
      <div className="relative w-full max-w-[450px] aspect-[3/4] flex items-center justify-center">
        <svg
          viewBox="0 0 300 420"
          className="w-full h-full drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          style={{ overflow: "visible" }}
        >
          {/* Defs for premium high-tech look and shadows */}
          <defs>
            {/* Matte metal gradient for clamps and rods */}
            <linearGradient id="metal-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="25%" stopColor="#475569" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="75%" stopColor="#475569" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Glowing cyan indicator for liquid in burette */}
            <linearGradient id="cyan-liquid" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.85" />
            </linearGradient>

            {/* Borosilicate glass edge tint linear gradient */}
            <linearGradient id="glass-edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.9" />
              <stop offset="4%" stopColor="#0ea5e9" stopOpacity="0.5" />
              <stop offset="15%" stopColor="rgba(255,255,255,0.02)" />
              <stop offset="85%" stopColor="rgba(255,255,255,0.02)" />
              <stop offset="96%" stopColor="#0ea5e9" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.95" />
            </linearGradient>

            {/* Premium glass refraction gradient */}
            <linearGradient id="glass-reflect" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
              <stop offset="12%" stopColor="rgba(255,255,255,0.03)" />
              <stop offset="88%" stopColor="rgba(255,255,255,0.03)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.28)" />
            </linearGradient>

            {/* Bright specular highlight */}
            <linearGradient id="glass-specular" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
              <stop offset="25%" stopColor="rgba(255,255,255,0.0)" />
              <stop offset="85%" stopColor="rgba(255,255,255,0.0)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.3)" />
            </linearGradient>

            {/* White PTFE stirrer capsule gradient with 3D shading */}
            <linearGradient id="ptfe-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#f4f4f5" />
              <stop offset="70%" stopColor="#e4e4e7" />
              <stop offset="100%" stopColor="#a1a1aa" />
            </linearGradient>

            {/* Soft vortex highlight gradient for internal velocity representation */}
            <linearGradient id="vortex-highlight-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.01)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.25)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
            </linearGradient>

            {/* Premium glass refraction filter simulating borosilicate glass thickness and light distortion */}
            <filter id="glass-refraction" x="-20%" y="-20%" width="140%" height="140%">
              {/* Blur the alpha channel of the glassware to capture the edges */}
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
              {/* Remap the alpha values using feComponentTransfer to map the blurred edge region */}
              <feComponentTransfer in="blur" result="edge-refract">
                <feFuncA type="table" tableValues="0 0.1 0.4 0.8 1.0 0.8 0.4 0.1 0" />
              </feComponentTransfer>
              {/* Tint the isolated edges to a premium borosilicate cyan/blue edge-glow refraction */}
              <feColorMatrix type="matrix" values="
                0 0 0 0 0.05
                0 0 0 0 0.65
                0 0 0 0 0.95
                0 0 0 1 0
              " in="edge-refract" result="colored-edge" />
              {/* Diffuse lighting for soft 3D ambient volume and realistic light dispersion */}
              <feDiffuseLighting in="blur" surfaceScale="2.0" diffuseConstant="0.85" lightingColor="#f1f5f9" result="diffuse">
                <feDistantLight azimuth="225" elevation="45" />
              </feDiffuseLighting>
              {/* Blend diffuse light with the SourceGraphic to add ambient depth */}
              <feComposite in="SourceGraphic" in2="diffuse" operator="arithmetic" k1="0.35" k2="0.75" k3="0" k4="0" result="lit-source" />
              {/* Specular lighting for realistic 3D reflection luster */}
              <feSpecularLighting in="blur" surfaceScale="2.5" specularConstant="1.5" specularExponent="35" lightingColor="#ffffff" result="specular">
                <feDistantLight azimuth="225" elevation="65" />
              </feSpecularLighting>
              <feComposite in="specular" in2="SourceAlpha" operator="in" result="specular-clipped" />
              {/* Composite the illuminated glassware, the refract edge glow, and the specular gloss */}
              <feMerge>
                <feMergeNode in="lit-source" />
                <feMergeNode in="colored-edge" />
                <feMergeNode in="specular-clipped" />
              </feMerge>
            </filter>

            {/* High-fidelity mask to clip the persistent liquid body smoothly */}
            <mask id="flask-liquid-mask">
              <rect x="0" y="0" width="300" height="420" fill="#000000" />
              <path
                ref={liquidMaskPathRef}
                fill="#ffffff"
                d="M 136 248 L 100 338 L 200 338 L 164 248 Z"
              />
            </mask>
          </defs>

          {/* 1. RETORT STAND */}
          {/* Base of retort stand - Styled as a dark slab of obsidian with polished steel bevel */}
          <rect x="44" y="380" width="212" height="14" rx="4" fill="#020617" stroke="#334155" strokeWidth="1.5" />
          <rect x="46" y="381" width="208" height="4" rx="2" fill="rgba(255,255,255,0.12)" />
          {/* Vertical rod of retort stand shifted to left (x=70) to support perfect horizontal centering of apparatus at 150 */}
          <rect x="70" y="15" width="8" height="365" rx="1.5" fill="url(#metal-grad)" stroke="#0f172a" strokeWidth="0.5" />
          {/* Rod end cap */}
          <ellipse cx="74" cy="15" rx="4" ry="1.5" fill="#475569" stroke="#1e293b" strokeWidth="0.5" />

          {/* 2. CERAMIC STIRRER PANEL / WHITE TILE */}
          {/* Smooth shadow under plate */}
          <ellipse cx="150" cy="342" rx="52" ry="6" fill="#020617" opacity="0.65" />
          
          {/* 3. MAGNETIC STIRRER DEVICE */}
          {/* Main Stirrer Body - Premium chamfered laboratory look */}
          <rect x="88" y="348" width="124" height="34" rx="8" fill="#18181b" stroke="#27272a" strokeWidth="1.2" />
          <rect x="90" y="349" width="120" height="2" rx="1" fill="rgba(255,255,255,0.08)" />
          {/* Stirrer premium ceramic top tile */}
          <rect x="88" y="340" width="124" height="8" rx="3" fill="#fafafa" stroke="#d4d4d8" strokeWidth="1.2" />
          <polygon points="90,348 210,348 204,354 96,354" fill="#e4e4e7" opacity="0.9" />
          
          {/* Interface panel of stirrer */}
          <rect x="98" y="356" width="104" height="20" rx="4" fill="#09090b" stroke="#27272a" strokeWidth="1" />
          {/* Stirrer indicator LED - Breathing light pulse with halo */}
          <motion.circle
            cx="110"
            cy="366"
            r="3"
            fill={stirrerSpeed > 0 ? "#10b981" : "#ef4444"}
            style={{
              transition: "fill 250ms ease-out, filter 250ms ease-out",
            }}
            animate={{
              opacity: [0.7, 1, 0.7],
              scale: stirrerSpeed > 0 ? [1, 1.2, 1] : [1, 1, 1],
            }}
            transition={{
              duration: stirrerSpeed > 0 ? 1.2 : 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.circle
            cx="110"
            cy="366"
            r="6"
            fill={stirrerSpeed > 0 ? "#10b981" : "#ef4444"}
            initial={{ opacity: 0.15 }}
            animate={{
              opacity: [0.15, 0.45, 0.15],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: stirrerSpeed > 0 ? 1.2 : 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              transition: "fill 250ms ease-out",
              pointerEvents: "none",
            }}
          />
          {/* Screen printed RPM scale lines */}
          <g opacity="0.35" stroke="#71717a" strokeWidth="0.5">
            <line x1="174" y1="361" x2="176" y2="361" />
            <line x1="172" y1="364" x2="175" y2="365" />
            <line x1="174" y1="369" x2="176" y2="369" />
            <line x1="178" y1="371" x2="179" y2="369" />
          </g>
          {/* Stirrer speed knob dial with physical notch */}
          <circle cx="186" cy="366" r="6.5" fill="#27272a" stroke="#52525b" strokeWidth="1.5" />
          <line
            x1="186" y1="366"
            x2={186 + 5.5 * Math.cos((stirrerSpeed / 100) * 2 * Math.PI - Math.PI / 2)}
            y2={366 + 5.5 * Math.sin((stirrerSpeed / 100) * 2 * Math.PI - Math.PI / 2)}
            stroke="#f4f4f5"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* 4. CLAMPS HOLDING GLASSWARE */}
          {/* Double-jaw Butterfly Burette Holder extending from stand rod */}
          {/* Back plate of clamp */}
          <rect x="74" y="112" width="76" height="6" rx="1.5" fill="url(#metal-grad)" stroke="#1e293b" strokeWidth="0.5" />
          {/* Boss head connector to retort rod */}
          <rect x="66" y="107" width="16" height="16" rx="2" fill="#334155" stroke="#1e293b" strokeWidth="1" />
          <circle cx="74" cy="115" r="4.5" fill="#0f172a" />
          {/* Metallic thumbscrew/knob for retort rod attachment */}
          <circle cx="62" cy="115" r="4" fill="#64748b" stroke="#334155" strokeWidth="0.5" />
          <line x1="58" y1="115" x2="66" y2="115" stroke="#475569" strokeWidth="1.5" />
          {/* Double spring steel clips of the butterfly burette clamp */}
          <path d="M 115,103 C 111,109 111,121 115,127" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
          <path d="M 125,103 C 129,109 129,121 125,127" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
          <ellipse cx="120" cy="115" rx="3.5" ry="1.8" fill="#e2e8f0" stroke="#475569" strokeWidth="0.5" />
          {/* Red rubber-coated clamp arms securely gripping the burette body */}
          <path d="M 141,107 Q 143,103 146,107 M 141,123 Q 143,127 146,123" fill="none" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 154,107 Q 157,103 159,107 M 154,123 Q 157,127 159,123" fill="none" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" />

          {/* Supporting Boss Head and Clamp for Analytical Probes (at y=210) */}
          <rect x="74" y="208" width="68" height="5" rx="1" fill="url(#metal-grad)" stroke="#1e293b" strokeWidth="0.5" />
          <rect x="66" y="202" width="16" height="16" rx="2" fill="#334155" stroke="#1e293b" strokeWidth="1" />
          <circle cx="74" cy="210" r="4.5" fill="#0f172a" />
          <circle cx="62" cy="210" r="4" fill="#64748b" stroke="#334155" strokeWidth="0.5" />
          <line x1="58" y1="210" x2="66" y2="210" stroke="#475569" strokeWidth="1.5" />

          {/* 5. BURETTE BODY - Perfectly Centered Horizontally at 150 */}
          {/* Outer borosilicate glass tube shadow and refraction */}
          <rect x="143" y="15" width="14" height="210" rx="1" fill="rgba(10, 20, 30, 0.25)" stroke="url(#glass-edge-grad)" strokeWidth="1.2" filter="url(#glass-refraction)" />
          {/* Glass tube internal refraction gradient */}
          <rect x="144" y="15" width="12" height="210" rx="0.5" fill="url(#glass-reflect)" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.5" />
          
          {/* Volumetric indicators (Duran Class A styled precise ticks) */}
          <g>
            {/* Class A Brand Markings */}
            <text x="150" y="21" className="text-[3.5px] font-sans font-bold fill-zinc-500/80 tracking-widest text-center" textAnchor="middle">
              DURAN
            </text>
            <text x="150" y="24" className="text-[2.2px] font-mono fill-zinc-500/65 text-center" textAnchor="middle">
              CLASS A 50mL 20°C
            </text>
            
            {buretteTicks.map((t, idx) => (
              <g key={idx}>
                <line
                  x1={t.x1}
                  y1={t.yPos}
                  x2={t.x2}
                  y2={t.yPos}
                  stroke={t.stroke}
                  strokeWidth={t.strokeWidth}
                />
                {t.showText && (
                  <text
                    x="136"
                    y={t.yPos + 2}
                    className="text-[6.5px] font-mono font-medium fill-zinc-400 select-none"
                    textAnchor="end"
                    style={{ fontSize: t.fontSize, fontWeight: t.fontWeight }}
                  >
                    {t.mL}
                  </text>
                )}
              </g>
            ))}
          </g>
          
          {/* Titrant Liquid in Burette */}
          {titrantRemaining > 0 && (
            <rect
              x="145"
              y={liquidTopY}
              width="10"
              height={liquidHeight}
              fill="url(#cyan-liquid)"
              className="transition-all duration-300 ease-out"
            />
          )}

          {/* Meniscus curvature on burette liquid */}
          {titrantRemaining > 0 && (
            <path
              d={`M145,${liquidTopY} Q150,${liquidTopY + 2.5} 155,${liquidTopY}`}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="1.5"
            />
          )}

          {/* Glass specular shine highlight on front of burette */}
          <rect x="145" y="15" width="3" height="210" fill="url(#glass-specular)" />

          {/* 6. STOPCOCK (PTFE Valve assembly) */}
          {/* Tapered glass funnel leading into stopcock */}
          <path d="M144,225 L146,240 L154,240 L156,225 Z" fill="url(#glass-reflect)" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="0.75" />
          
          {/* Transverse Teflon (PTFE) glass barrel housing */}
          <rect x="135" y="240" width="30" height="12" rx="2" fill="rgba(255, 255, 255, 0.12)" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.5" />
          {/* White internal PTFE rotating plug */}
          <rect x="137" y="241" width="26" height="10" rx="1" fill="#f4f4f5" stroke="#e4e4e7" strokeWidth="0.5" />
          
          {/* Rotating red Teflon wing handle */}
          <g
            ref={stopcockRef}
            style={{ transformOrigin: "150px 246px", willChange: "transform" }}
            className="cursor-pointer hover:brightness-110"
            onClick={handleStopcockClick}
          >
            {/* Red handle body */}
            <rect x="138" y="243" width="24" height="6" rx="2" fill="#ef4444" stroke="#dc2626" strokeWidth="0.75" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }} />
            {/* Ribbed grips */}
            <rect x="147" y="235" width="6" height="22" rx="1.5" fill="#ef4444" stroke="#dc2626" strokeWidth="0.75" />
            {/* Retaining bolt and screw caps */}
            <circle cx="150" cy="246" r="3.5" fill="#94a3b8" stroke="#475569" strokeWidth="0.5" />
            <circle cx="150" cy="246" r="1.5" fill="#334155" />
          </g>

          {/* Glass outlet dispensing tip */}
          <path d="M146,252 L148,274 L152,274 L154,252 Z" fill="url(#glass-reflect)" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="0.5" />
          {/* Internal capillary channel */}
          <line x1="150" y1="252" x2="150" y2="274" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="0.75" />
          {titrantRemaining > 0 && (
            <line x1="150" y1="252" x2="150" y2="274" stroke="#38bdf8" strokeWidth="0.75" />
          )}

          {/* 7. FALLING DROPLET - Physically accurate liquid teardrop rendering */}
          <path
            ref={dropletRef}
            fill="#38bdf8"
            opacity="0"
            style={{ willChange: "transform, opacity" }}
          />

          {/* DROP IMPACT RIPPLE & SPLASH - Micro-physics effects */}
          <ellipse
            ref={rippleRef}
            cx="150"
            cy="300"
            rx="0"
            ry="0"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.2"
            opacity="0"
            style={{ willChange: "transform, opacity" }}
          />
          <circle
            ref={splashLeftRef}
            cx="148"
            cy="300"
            r="1.0"
            fill="#38bdf8"
            opacity="0"
            style={{ willChange: "transform, opacity" }}
          />
          <circle
            ref={splashRightRef}
            cx="152"
            cy="300"
            r="1.0"
            fill="#38bdf8"
            opacity="0"
            style={{ willChange: "transform, opacity" }}
          />
          <circle
            ref={splashCenterRef}
            cx="150"
            cy="300"
            r="1.3"
            fill="#38bdf8"
            opacity="0"
            style={{ willChange: "transform, opacity" }}
          />

          {/* 8. REALISTIC ERLENMEYER FLASK (Borosilicate Glass, proper neck & body) */}
          {/* Glass base contact shadow on the stirrer top plate */}
          <ellipse cx="150" cy="341.5" rx="51" ry="3.5" fill="rgba(0,0,0,0.3)" filter="blur(1.5px)" />
          {/* Glass base thickness shadow */}
          <path d="M 100,338 Q 150,342 200,338 L 201,340 Q 150,344 99,340 Z" fill="rgba(255,255,255,0.15)" />

          {/* Outer Glassware Outline with realistic borosilicate edge-glow refraction */}
          <path
            d="M 134,246 L 136,280 L 100,338 Q 150,342 200,338 L 164,280 L 166,246"
            fill="url(#glass-reflect)"
            stroke="url(#glass-edge-grad)"
            strokeWidth="1.6"
            filter="url(#glass-refraction)"
          />

          {/* Inner wall to show glass thickness */}
          <path
            d="M 136,248 L 138,280 L 103,336 Q 150,339.5 197,336 L 162,280 L 164,248"
            fill="none"
            stroke="rgba(255, 255, 255, 0.14)"
            strokeWidth="0.8"
          />

          {/* Flask lip / rim with 3D elliptical mouth depth */}
          <ellipse cx="150" cy="246" rx="16" ry="2.5" fill="none" stroke="url(#glass-edge-grad)" strokeWidth="1.5" />
          <ellipse cx="150" cy="246" rx="13" ry="1.5" fill="none" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="0.5" />

          {/* Specular reflections on glass curved edges for photorealistic luster */}
          <path
            d="M 137,252 L 139,280 L 105,334"
            fill="none"
            stroke="rgba(255, 255, 255, 0.32)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M 163,252 L 161,280 L 195,334"
            fill="none"
            stroke="rgba(255, 255, 255, 0.18)"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
          <path
            d="M 112,335 Q 150,338.5 188,335"
            fill="none"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="1.0"
          />

          {/* Calibrated volumetric markings */}
          <line x1="120" y1="315" x2="125" y2="315" stroke="rgba(255,255,255,0.25)" strokeWidth="0.75" />
          <text x="114" y="317" className="text-[4.5px] font-sans font-bold fill-zinc-500/80 select-none">50mL</text>
          
          <line x1="113" y1="325" x2="119" y2="325" stroke="rgba(255,255,255,0.25)" strokeWidth="0.75" />
          <text x="107" y="327" className="text-[4.5px] font-sans font-bold fill-zinc-500/80 select-none">100mL</text>

          {/* Dynamic Liquid Body in Flask with Single Persistent Path and Mask */}
          <g mask="url(#flask-liquid-mask)">
            <path
              ref={liquidBodyRef}
              d="M 136,248 L 138,280 L 103,336 Q 150,339.5 197,336 L 162,280 L 164,248 Z"
              fill={indicatorColor}
              opacity="0.45"
              className="transition-colors duration-500 ease-in-out"
            />
            {/* Gentle Internal Velocity Gradient / Vortex Shading */}
            <path
              ref={vortexCoreRef}
              fill="url(#vortex-highlight-grad)"
              className="pointer-events-none"
              style={{ mixBlendMode: "overlay" }}
              opacity="0.08"
            />
          </g>

          {/* Curved liquid top surface (meniscus reflection) drawn on top of masked body with dual-layered high-tension light-paths */}
          <path
            ref={liquidSurfaceRef}
            d={`M ${initialLeftX},${initialTopY} Q 150,${initialTopY + 1.5} ${initialRightX},${initialTopY}`}
            fill="none"
            stroke={indicatorColor}
            strokeWidth="2.5"
            opacity="0.3"
          />
          <path
            d={`M ${initialLeftX},${initialTopY} Q 150,${initialTopY + 1.2} ${initialRightX},${initialTopY}`}
            fill="none"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="1.0"
            opacity="0.85"
          />

          {/* 9. ANALYTICAL MEASUREMENT PROBES */}
          {/* Cables routing out smoothly to represent connection to analytical meter consoles */}
          <path d="M 142,198 Q 115,160 82,185" fill="none" stroke="#4b5563" strokeWidth="1.0" opacity="0.65" strokeDasharray="3,1" />
          <path d="M 158,198 Q 185,155 220,175" fill="none" stroke="#2563eb" strokeWidth="1.3" opacity="0.75" />

          {/* Steel Temperature thermocouple probe on the left (x=142) */}
          <g>
            {/* Upper probe handle/grip held by clamp */}
            <rect x="140.5" y="196" width="3" height="15" rx="0.8" fill="#475569" stroke="#1e293b" strokeWidth="0.5" />
            <rect x="141" y="201" width="2" height="3" fill="#cbd5e1" />
            {/* Stainless steel sheath dipping deep into flask */}
            <rect x="141.25" y="211" width="1.5" height="88" rx="0.5" fill="url(#metal-grad)" stroke="#334155" strokeWidth="0.2" />
            {/* Tip sensor */}
            <rect x="141.25" y="295" width="1.5" height="4" rx="0.5" fill="#1e293b" />
          </g>

          {/* Glass pH Electrode probe on the right (x=158) */}
          <g>
            {/* Electrode cap / connection collar */}
            <rect x="155.5" y="198" width="5" height="14" rx="1" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
            <rect x="155" y="202" width="6" height="3" rx="0.5" fill="#2563eb" /> {/* blue brand band */}
            {/* Epoxy body */}
            <rect x="156" y="212" width="4" height="78" rx="0.8" fill="rgba(30, 41, 59, 0.9)" stroke="#475569" strokeWidth="0.3" />
            {/* Internal glass capillary stem visible through amber translucent epoxy body */}
            <line x1="158" y1="214" x2="158" y2="288" stroke="#38bdf8" strokeWidth="0.5" opacity="0.5" />
            {/* pH glass bulb tip submerged in flask buffer liquid */}
            <circle cx="158" cy="292" r="2.2" fill="#60a5fa" stroke="#2563eb" strokeWidth="0.4" opacity="0.85" />
            <circle cx="157.2" cy="291" r="0.7" fill="#ffffff" opacity="0.6" /> {/* Specular highlight on bulb */}
            {/* Protective bulb guard cage */}
            <path d="M 155.5,288 L 155.5,296 C 155.5,296 158,298.5 160.5,296 L 160.5,288" fill="none" stroke="#0f172a" strokeWidth="0.6" />
          </g>

          {/* Realistic PTFE Magnetic Stir Bar Capsule - Centered at the flask bottom (y=337.5) */}
          <g ref={stirBarRef} className="pointer-events-none">
            {/* Contact drop shadow on the bottom glass floor */}
            <ellipse
              cx="0"
              cy="2.5"
              rx="10"
              ry="0.8"
              fill="rgba(0,0,0,0.25)"
              filter="blur(0.5px)"
            />
            {/* Cylindrical PTFE Capsule Body */}
            <rect
              x="-12"
              y="-2.5"
              width="24"
              height="5"
              rx="2.5"
              fill="url(#ptfe-grad)"
              stroke="#cbd5e1"
              strokeWidth="0.4"
            />
            {/* Pivot Ring / Center ridge for professional lab equipment realism */}
            <rect
              x="-1"
              y="-2.9"
              width="2"
              height="5.8"
              rx="0.5"
              fill="#ffffff"
              stroke="#94a3b8"
              strokeWidth="0.35"
            />
            {/* Specular highlight along the top curve of the cylinder */}
            <line
              x1="-10"
              y1="-1.2"
              x2="10"
              y2="-1.2"
              stroke="rgba(255, 255, 255, 0.6)"
              strokeWidth="0.5"
              strokeLinecap="round"
            />
          </g>

          {/* Glass edge reflections */}
          <path d="M144,286 L148,286" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
          <path d="M116,334 L122,324" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
          <path d="M184,334 L178,324" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
        </svg>

        {/* Dynamic drop animation confirmation banner */}
        {isSimulating && (
          <div className="absolute bottom-12 bg-emerald-500/90 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full shadow-[0_4px_20px_rgba(16,185,129,0.3)] font-medium flex items-center gap-1.5 animate-bounce select-none border border-emerald-400/20">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            {isArabic ? "تحريك وتفاعل نشط..." : "Stirring & Reacting..."}
          </div>
        )}
      </div>

      {/* Manual speed controller overlay for magnetic stirrer */}
      <div className="w-full max-w-xs mt-4 bg-zinc-950/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] glass-layered-shadow p-3">
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
          <span className="flex items-center gap-1.5 font-mono uppercase tracking-wider text-[10px]">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            {t.stirrer}
          </span>
          <span className="font-mono text-indigo-400">{stirrerSpeed}%</span>
        </div>
        <div className="flex items-center gap-2.5 mt-2">
          <input
            type="range"
            min="0"
            max="100"
            value={stirrerSpeed}
            onChange={(e) => onStirrerSpeedChange?.(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </div>
    </div>
  );
});
