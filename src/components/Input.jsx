// src/components/Input.jsx
import clsx from "clsx"

export default function Input({ className, ...otherProps }) {
  return (
    <input
      className={clsx(
        "rounded-md p-3 text-lg font-medium outline-none border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
        className,
      )}
      {...otherProps}
    />
  )
}