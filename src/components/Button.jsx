// src/components/Button.jsx
import clsx from "clsx"
import { motion } from "framer-motion"

export default function Button({ children, className, disabled, ...otherProps }) {
  return (
    <motion.button
      className={clsx(
        "btn-shadow rounded-md bg-primary p-2 text-lg font-semibold text-white transition-all",
        disabled && "opacity-70 cursor-not-allowed",
        className,
      )}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      disabled={disabled}
      {...otherProps}
    >
      <span>{children}</span>
    </motion.button>
  )
}