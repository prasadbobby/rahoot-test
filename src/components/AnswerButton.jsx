// src/components/AnswerButton.jsx
import clsx from "clsx"
import { motion } from "framer-motion"

export default function AnswerButton({
  className,
  icon: Icon,
  children,
  ...otherProps
}) {
  return (
    <motion.button
      className={clsx(
        "shadow-inset flex items-center gap-3 rounded-lg px-4 py-6 text-left transition-all",
        className,
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...otherProps}
    >
      <Icon className="h-6 w-6 drop-shadow-md" />
      <span className="drop-shadow-md font-bold">{children}</span>
    </motion.button>
  )
}