// src/components/Form.jsx
import { motion } from "framer-motion"

export default function Form({ children, className }) {
  return (
    <motion.div 
      className={`z-10 flex w-full max-w-80 flex-col gap-4 rounded-lg bg-white p-6 shadow-card ${className || ""}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  )
}