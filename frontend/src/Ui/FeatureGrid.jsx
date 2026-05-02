import { motion } from 'framer-motion';
import { 
  TerminalSquare, 
  Star, 
} from 'lucide-react';

export default function FeatureGrid() {
  const tools = [
   {
      title: "Automatic code checks",
      desc: "Our system scans your solution against multiple test cases to verify logic instantly.",
      // High-level "Scanning & Verification" Composition
      illustration: (
        <div className="relative w-20 h-20 flex items-center justify-center group">
          {/* Subtle ambient glow - restricted and highly muted */}
          <div className="absolute inset-0 bg-emerald-500/5 blur-2xl rounded-full group-hover:bg-emerald-500/10 transition-colors duration-500" />
          
          <svg 
            viewBox="0 0 200 200" 
            className="w-full h-full" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <clipPath id="editor-clip">
                <rect width="160" height="130" rx="8" />
              </clipPath>

              {/* Ultra-subtle linear background for the editor */}
              <linearGradient id="editor-surface" x1="0" y1="0" x2="0" y2="130" gradientUnits="userSpaceOnUse">
                <stop stopColor="#09090B" />
                <stop offset="1" stopColor="#18181B" />
              </linearGradient>

              {/* Scanner Line Glow */}
              <filter id="laser-glow" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <g transform="translate(20, 35)">
              
              {/* --- EDITOR CHASSIS --- */}
              <rect width="160" height="130" rx="8" fill="url(#editor-surface)" stroke="#27272A" strokeWidth="1" />
              
              {/* macOS Control Dots (Minimalist) */}
              <circle cx="14" cy="14" r="2.5" fill="#3F3F46" />
              <circle cx="24" cy="14" r="2.5" fill="#3F3F46" />
              <line x1="0" y1="28" x2="160" y2="28" stroke="#27272A" strokeWidth="1" />

              {/* --- REALISTIC SYNTAX STRUCTURE --- */}
              <g transform="translate(16, 42)" opacity="0.8">
                {/* Line 1: Function Declaration */}
                <rect x="0" y="0" width="24" height="4" rx="2" fill="#C4B5FD" /> {/* Keyword */}
                <rect x="28" y="0" width="45" height="4" rx="2" fill="#93C5FD" /> {/* Function Name */}
                <rect x="77" y="0" width="20" height="4" rx="2" fill="#FCA5A5" /> {/* Params */}
                
                {/* Line 2: Indented Loop/Condition */}
                <rect x="12" y="14" width="20" height="4" rx="2" fill="#C4B5FD" />
                <rect x="36" y="14" width="55" height="4" rx="2" fill="#D1D5DB" />
                
                {/* Line 3: Deeply nested logic */}
                <rect x="24" y="28" width="30" height="4" rx="2" fill="#93C5FD" />
                <rect x="58" y="28" width="40" height="4" rx="2" fill="#D1D5DB" />
                
                {/* Line 4: Deeply nested logic continued */}
                <rect x="24" y="42" width="60" height="4" rx="2" fill="#D1D5DB" />
                
                {/* Line 5: Return Statement */}
                <rect x="12" y="56" width="24" height="4" rx="2" fill="#C4B5FD" />
                <rect x="40" y="56" width="30" height="4" rx="2" fill="#6EE7B7" />
                
                {/* Line 6: Closing Brace */}
                <rect x="0" y="70" width="8" height="4" rx="2" fill="#A1A1AA" />
              </g>

              {/* --- CLIP GROUP FOR SCANNER & OVERLAY --- */}
              <g clipPath="url(#editor-clip)">
                
                {/* --- LINTING SCANNER LINE --- */}
                {/* Scans down strictly once per cycle, then resets instantly */}
                <g>
                  <animateTransform 
                    attributeName="transform" 
                    type="translate" 
                    values="0 28; 0 130; 0 130" 
                    dur="4s" 
                    repeatCount="indefinite" 
                    calcMode="spline"
                    keySplines="0.4 0 0.2 1; 0 0 1 1"
                  />
                  <line x1="0" y1="0" x2="160" y2="0" stroke="#10B981" strokeWidth="1.5" filter="url(#laser-glow)" />
                  <rect x="0" y="-30" width="160" height="30" fill="#10B981" opacity="0.05" />
                </g>

                {/* --- TRANSPARENT STATUS OVERLAY --- */}
                {/* Snaps in after the scan, no floating, no bouncing */}
                <g>
                  <animate 
                    attributeName="opacity" 
                    values="0; 0; 1; 1; 0" 
                    dur="4s" 
                    repeatCount="indefinite" 
                    keyTimes="0; 0.45; 0.5; 0.9; 1"
                  />
                  
                  {/* Backdrop dimming */}
                  <rect width="160" height="130" fill="#000000" opacity="0.6" />
                  
                  {/* Transparent Glass Banner */}
                  <rect x="20" y="45" width="120" height="40" rx="6" fill="#10B981" fillOpacity="0.08" stroke="#10B981" strokeOpacity="0.3" strokeWidth="1" />
                  
                  {/* Minimal Checkmark & Text Layout */}
                  <g transform="translate(36, 65)">
                    {/* Checkmark */}
                    <path 
                      d="M0 -3 L4 1 L12 -7" 
                      stroke="#10B981" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />
                    {/* Status Text (Simulated as geometric lines to match the SVG icon scale) */}
                    <rect x="22" y="-6" width="35" height="4" rx="2" fill="#10B981" />
                    <rect x="22" y="1" width="20" height="3" rx="1.5" fill="#10B981" opacity="0.5" />
                  </g>
                </g>

              </g>
            </g>
          </svg>
        </div>
      )
    },
   {
      title: "Problem Architecture",
      desc: "Architect custom coding challenges by defining the narrative, code templates, and test cases in a unified workspace.",
      // High-level "Modular Assembly" Composition
      illustration: (
        <div className="relative w-20 h-20 flex items-center justify-center group">
          {/* Strict, subtle ambient chassis glow */}
          <div className="absolute inset-0 bg-emerald-500/5 blur-2xl rounded-full group-hover:bg-emerald-500/10 transition-colors duration-500" />
          
          <svg 
            viewBox="0 0 200 200" 
            className="w-full h-full" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="chassis-surface" x1="0" y1="0" x2="0" y2="150" gradientUnits="userSpaceOnUse">
                <stop stopColor="#09090B" />
                <stop offset="1" stopColor="#18181B" />
              </linearGradient>

              <linearGradient id="module-surface" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="#18181B" />
                <stop offset="1" stopColor="#27272A" />
              </linearGradient>

              {/* Minimal glow for the success plate */}
              <filter id="success-glow" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              <clipPath id="workspace-clip">
                <rect x="20" y="45" width="160" height="125" rx="4" />
              </clipPath>
            </defs>

            <g transform="translate(20, 20)">
              
              {/* --- MAIN WORKSPACE CHASSIS --- */}
              <rect width="160" height="150" rx="6" fill="url(#chassis-surface)" stroke="#27272A" strokeWidth="1" />
              
              {/* Top Control Panel */}
              <line x1="0" y1="24" x2="160" y2="24" stroke="#27272A" strokeWidth="1" />
              
              {/* Indicator Lights (Syncs with modules snapping in) */}
              <g transform="translate(12, 10)">
                <rect x="0" y="0" width="12" height="4" rx="1" fill="#3F3F46">
                  <animate attributeName="fill" values="#3F3F46; #3F3F46; #10B981; #10B981; #3F3F46; #3F3F46" dur="8s" repeatCount="indefinite" keyTimes="0; 0.1; 0.15; 0.85; 0.95; 1" />
                </rect>
                <rect x="16" y="0" width="12" height="4" rx="1" fill="#3F3F46">
                  <animate attributeName="fill" values="#3F3F46; #3F3F46; #3B82F6; #3B82F6; #3F3F46; #3F3F46" dur="8s" repeatCount="indefinite" keyTimes="0; 0.3; 0.35; 0.85; 0.95; 1" />
                </rect>
                <rect x="32" y="0" width="12" height="4" rx="1" fill="#3F3F46">
                  <animate attributeName="fill" values="#3F3F46; #3F3F46; #A855F7; #A855F7; #3F3F46; #3F3F46" dur="8s" repeatCount="indefinite" keyTimes="0; 0.5; 0.55; 0.85; 0.95; 1" />
                </rect>
              </g>

              {/* Workspace Grid Background */}
              <g stroke="#27272A" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5">
                <line x1="20" y1="24" x2="20" y2="150" />
                <line x1="140" y1="24" x2="140" y2="150" />
                <line x1="0" y1="75" x2="160" y2="75" />
                <line x1="0" y1="115" x2="160" y2="115" />
              </g>

              {/* --- DYNAMIC MODULES (Clipped to workspace) --- */}
              <g clipPath="url(#workspace-clip)">
                
                {/* 1. NARRATIVE MODULE (Story) */}
                <g>
                  <animateTransform attributeName="transform" type="translate" values="10 15; 10 15; 10 32; 10 32; 10 15; 10 15" dur="8s" repeatCount="indefinite" keyTimes="0; 0.05; 0.15; 0.85; 0.95; 1" calcMode="spline" keySplines="0 0 1 1; 0.4 0 0.2 1; 0 0 1 1; 0.4 0 0.2 1; 0 0 1 1" />
                  <animate attributeName="opacity" values="0; 0; 1; 1; 0; 0" dur="8s" repeatCount="indefinite" keyTimes="0; 0.05; 0.15; 0.85; 0.95; 1" />
                  
                  <rect width="140" height="26" rx="4" fill="url(#module-surface)" stroke="#3F3F46" strokeWidth="1" />
                  {/* Left Accent Bar */}
                  <rect x="0" y="4" width="2" height="18" fill="#10B981" />
                  {/* Simulated Text Lines */}
                  <rect x="12" y="6" width="100" height="3" rx="1.5" fill="#A1A1AA" />
                  <rect x="12" y="12" width="115" height="3" rx="1.5" fill="#71717A" />
                  <rect x="12" y="18" width="80" height="3" rx="1.5" fill="#71717A" />
                </g>

                {/* 2. LOGIC TEMPLATE MODULE (Code) */}
                <g>
                  <animateTransform attributeName="transform" type="translate" values="10 45; 10 45; 10 66; 10 66; 10 45; 10 45" dur="8s" repeatCount="indefinite" keyTimes="0; 0.25; 0.35; 0.85; 0.95; 1" calcMode="spline" keySplines="0 0 1 1; 0.4 0 0.2 1; 0 0 1 1; 0.4 0 0.2 1; 0 0 1 1" />
                  <animate attributeName="opacity" values="0; 0; 1; 1; 0; 0" dur="8s" repeatCount="indefinite" keyTimes="0; 0.25; 0.35; 0.85; 0.95; 1" />
                  
                  <rect width="140" height="42" rx="4" fill="url(#module-surface)" stroke="#3F3F46" strokeWidth="1" />
                  {/* Left Accent Bar */}
                  <rect x="0" y="4" width="2" height="34" fill="#3B82F6" />
                  {/* Simulated Syntax Highlighting */}
                  <rect x="12" y="8" width="20" height="4" rx="2" fill="#C4B5FD" />
                  <rect x="36" y="8" width="40" height="4" rx="2" fill="#93C5FD" />
                  <rect x="20" y="18" width="60" height="4" rx="2" fill="#D1D5DB" />
                  <rect x="20" y="28" width="20" height="4" rx="2" fill="#C4B5FD" />
                  <rect x="44" y="28" width="30" height="4" rx="2" fill="#6EE7B7" />
                </g>

                {/* 3. TEST CASE DATA MODULE (IO) */}
                <g>
                  <animateTransform attributeName="transform" type="translate" values="10 95; 10 95; 10 116; 10 116; 10 95; 10 95" dur="8s" repeatCount="indefinite" keyTimes="0; 0.45; 0.55; 0.85; 0.95; 1" calcMode="spline" keySplines="0 0 1 1; 0.4 0 0.2 1; 0 0 1 1; 0.4 0 0.2 1; 0 0 1 1" />
                  <animate attributeName="opacity" values="0; 0; 1; 1; 0; 0" dur="8s" repeatCount="indefinite" keyTimes="0; 0.45; 0.55; 0.85; 0.95; 1" />
                  
                  <rect width="140" height="26" rx="4" fill="url(#module-surface)" stroke="#3F3F46" strokeWidth="1" />
                  {/* Left Accent Bar */}
                  <rect x="0" y="4" width="2" height="18" fill="#A855F7" />
                  
                  {/* Input Data Block */}
                  <rect x="12" y="6" width="55" height="14" rx="2" fill="#09090B" stroke="#3F3F46" strokeWidth="1" />
                  <rect x="16" y="11" width="30" height="4" rx="2" fill="#A1A1AA" />
                  
                  {/* Flow Arrow */}
                  <path d="M72 13 L76 13 L74 11 M76 13 L74 15" stroke="#71717A" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {/* Output Data Block */}
                  <rect x="80" y="6" width="48" height="14" rx="2" fill="#10B981" fillOpacity="0.1" stroke="#10B981" strokeOpacity="0.3" strokeWidth="1" />
                  <rect x="84" y="11" width="20" height="4" rx="2" fill="#10B981" opacity="0.8" />
                  <path d="M116 11 L118 14 L123 9" stroke="#10B981" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                </g>
                
              </g>

            </g>
          </svg>
        </div>
      )
    },
   {
      title: "Real creator feedback",
      desc: "Receive scores and architectural notes directly from the people who built the tasks.",
      // High-level "Human Review" Composition
      illustration: (
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-blue-500/5 blur-2xl rounded-full" />
          
          <svg 
            viewBox="0 0 100 100" 
            className="w-full h-full text-white group-hover:text-zinc-300 transition-colors duration-500" 
            fill="none" 
            stroke="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Clip path defining the feedback panel boundary */}
              <clipPath id="feedback-panel-clip">
                <path d="M65 20h20v20L75 30l-10 10V20z" />
              </clipPath>
            </defs>

            {/* Static Human Icon */}
            <g>
              <path d="M30 70c0-11 9-20 20-20s20 9 20 20" strokeWidth="1" />
              <circle cx="50" cy="35" r="10" strokeWidth="1.5" />
            </g>

            {/* Sophisticated, Non-Repetitive Sequenced Feedback Animation */}
            {/* Populates internal feedback elements, then clears, in a slow loop */}
            <g transform="translate(65, 20)">
              {/* Initial Framer Motion entry animation is preserved */}
              <motion.g
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {/* Panel Outline & Backdrop */}
                <path d="M0 0h20v20L10 10l-10 10V0z" stroke="currentColor" strokeWidth="1" />
                <rect x="0" y="0" width="20" height="20" fill="#f4f4f5" opacity="0.1" />

                {/* --- SEQUENTIAL FEEDBACK DATA POPULATION --- */}
                {/* Clipped to panel boundary */}
                <g clipPath="url(#feedback-panel-clip)">
                  
                  {/* 1. Score Block (Appears first) */}
                  <g>
                    <animate attributeName="opacity" values="0; 1; 1; 0; 0" dur="6s" repeatCount="indefinite" keyTimes="0; 0.1; 0.75; 0.8; 1" />
                    {/* Simulated "Score" Indicator */}
                    <circle cx="5" cy="5" r="2.5" fill="#10B981" /> {/* Metric Green */}
                    <rect x="9" y="4" width="7" height="2" rx="1" fill="#10B981" />
                  </g>

                  {/* 2. Text Line 1 (Appears second) */}
                  <g>
                    <animate attributeName="opacity" values="0; 0; 1; 1; 0; 0" dur="6s" repeatCount="indefinite" keyTimes="0; 0.25; 0.3; 0.75; 0.8; 1" />
                    <rect x="2" y="9" width="16" height="2" rx="1" fill="#A1A1AA" />
                  </g>

                  {/* 3. Text Line 2 (Appears third) */}
                  <g>
                    <animate attributeName="opacity" values="0; 0; 1; 1; 0; 0" dur="6s" repeatCount="indefinite" keyTimes="0; 0.45; 0.5; 0.75; 0.8; 1" />
                    <rect x="2" y="13" width="12" height="2" rx="1" fill="#71717A" />
                  </g>

                  {/* 4. Deeply Nested "Architectural Note" (Appears last) */}
                  <g>
                    <animate attributeName="opacity" values="0; 0; 1; 1; 0; 0" dur="6s" repeatCount="indefinite" keyTimes="0; 0.65; 0.7; 0.75; 0.8; 1" />
                    {/* Deeply nested text line suggestion */}
                    <rect x="4" y="17" width="10" height="1.5" rx="0.75" fill="#6EE7B7" opacity="0.7" />
                  </g>

                </g>
              </motion.g>
            </g>
          </svg>
        </div>
      )
    },
   {
      title: "Your stats and progress",
      desc: "Monitor your completion rates and history through a simplified performance profile.",
      // High-level "Data Growth" Composition
      illustration: (
        <div className="relative w-20 h-20 flex items-center justify-center group">
          {/* Sligthly increased ambient glow for visibility */}
          <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-full transition-opacity duration-500" />
          
          <svg 
            viewBox="0 0 100 100" 

            className="w-full h-full text-white group-hover:text-emerald-400 transition-colors duration-500" 
            fill="none" 
            stroke="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Axis line - Inherits bright currentColor */}
            <path d="M20 80h60" strokeWidth="1" />
            
            {/* Original motion path - Inherits bright currentColor */}
            <motion.path 
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              d="M20 70l15-10 15 5 15-25 15 10" 
              stroke="currentColor" 
              strokeWidth="2" 
            />
            
            {/* End dot - Inherits bright currentColor fill */}
            <circle cx="80" cy="50" r="3" fill="currentColor" />
          </svg>
        </div>
      )
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <section className="py-24 px-6 border-b border-zinc-800 bg-[#09090b]">
      <div className="max-w-7xl mx-auto space-y-20">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
            </div>
            <h2 className="text-2xl font-medium text-white tracking-tight">
              Tools for technical growth.
            </h2>
          </div>
          <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
            Everything you need to build, solve, and track coding challenges in a single workspace.
          </p>
        </div>

        {/* 4-Column Feature Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800"
        >
          {tools.map((tool, i) => (
            <motion.div 
              key={i} 
              variants={itemVariants}
              className="bg-[#0c0c0e] p-10 space-y-10 hover:bg-[#111113] transition-all group relative overflow-hidden"
            >
              {/* Subtle lighting effect on hover */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-center group-hover:scale-110 transition-transform duration-700">
                {tool.illustration}
              </div>

              <div className="space-y-3 text-center">
                <h3 className="text-[15px] font-semibold text-zinc-200">
                  {tool.title}
                </h3>
                <p className="text-[13px] text-zinc-500 leading-relaxed">
                  {tool.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Technical Specification Footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-800 border border-zinc-800">
          <div className="p-10 bg-[#0c0c0e] group">
            <div className="flex items-start gap-5">
              <div className="p-3 bg-zinc-950 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <TerminalSquare size={20} className="text-zinc-500" />
              </div>
              <div className="space-y-3">
                <h4 className="text-[14px] font-semibold text-zinc-100">Execution workspace</h4>
                <p className="text-[12px] text-zinc-500 leading-relaxed font-mono">
                  Supported runtimes: Python 3.x and Java 17. All code is verified within a sub-second latency window.
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-10 bg-[#0c0c0e] group">
            <div className="flex items-start gap-5">
              <div className="p-3 bg-zinc-950 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <Star size={20} className="text-zinc-500" />
              </div>
              <div className="space-y-3">
                <h4 className="text-[14px] font-semibold text-zinc-100">Quality verification</h4>
                <p className="text-[12px] text-zinc-500 leading-relaxed font-mono">
                  Manual reviews provide depth beyond logic. Every submission generates a permanent quality record.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}