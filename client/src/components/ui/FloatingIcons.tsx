import { Activity, HeartPulse, Stethoscope, Pill, Sun, Droplets, Thermometer, ShieldPlus, Heart, Cross, Syringe } from 'lucide-react';
import { useEffect, useState } from 'react';

const ICONS = [Activity, HeartPulse, Stethoscope, Pill, Sun, Droplets, Thermometer, ShieldPlus, Heart, Cross, Syringe];

export default function FloatingIcons() {
  const [elements, setElements] = useState<any[]>([]);

  useEffect(() => {
    // Generate random icons client-side
    const newElements = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      Icon: ICONS[Math.floor(Math.random() * ICONS.length)],
      size: Math.floor(Math.random() * 35) + 20, 
      left: Math.floor(Math.random() * 100) + '%',
      animationDuration: Math.floor(Math.random() * 25) + 25 + 's', // Slower animation
      animationDelay: Math.floor(Math.random() * 20) + 's',
    }));
    setElements(newElements);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <style>
        {`
          @keyframes float-up {
            0% {
              transform: translateY(120px) rotate(0deg);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            90% {
              opacity: 1;
            }
            100% {
              transform: translateY(-110vh) rotate(360deg);
              opacity: 0;
            }
          }
          .animate-float-up {
            animation: float-up linear infinite;
          }
        `}
      </style>
      {elements.map(({ id, Icon, size, left, animationDuration, animationDelay }) => (
        <div
          key={id}
          className="absolute bottom-0 text-emerald-500/20 dark:text-emerald-500/10 animate-float-up"
          style={{
            left,
            animationDuration,
            animationDelay,
            width: size,
            height: size,
            opacity: 0
          }}
        >
          <Icon size={size} strokeWidth={1.5} />
        </div>
      ))}
    </div>
  );
}
