// src/components/Button.jsx
import clsx from "clsx"
import { motion } from "framer-motion"

export default function Button({ children, className, ...otherProps }) {
  return (
    <motion.button
      className={clsx(
        "btn-shadow rounded-md bg-primary p-2 text-lg font-semibold text-white transition-all",
        className,
      )}
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
      {...otherProps}
    >
      <span>{children}</span>
    </motion.button>
  )
}