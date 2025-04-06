// src/components/ManagerPassword.jsx
import Image from "next/image"
import Form from "@/components/Form"
import Button from "@/components/Button"
import Input from "@/components/Input"
import { useEffect, useState } from "react"
import { socket } from "@/context/socket"
import logo from "@/assets/logo.svg"
import toast from "react-hot-toast"
import Link from "next/link"

export default function ManagerPassword({ onSubmit, loading }) {
  const [password, setPassword] = useState("")

  const handleCreate = () => {
    if (onSubmit) {
      onSubmit(password);
    } else {
      // Fallback to direct socket emission if no onSubmit provided
      socket.emit("manager:createRoom", password);
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleCreate()
    }
  }

  useEffect(() => {
    const handleError = (message) => {
      toast.error(message);
    };
    
    socket.on("game:errorMessage", handleError);

    return () => {
      socket.off("game:errorMessage", handleError);
    }
  }, [])

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center">
      <div className="absolute h-full w-full overflow-hidden">
        <div className="absolute -left-[15vmin] -top-[15vmin] min-h-[75vmin] min-w-[75vmin] rounded-full bg-primary/15"></div>
        <div className="absolute -bottom-[15vmin] -right-[15vmin] min-h-[75vmin] min-w-[75vmin] rotate-45 bg-primary/15"></div>
      </div>

      <Image src={logo} className="mb-6 h-32" alt="logo" />

      <Form>
        <Input
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Manager password"
        />
        <Button 
          onClick={handleCreate} 
          disabled={loading}
          className={loading ? 'opacity-70 cursor-not-allowed' : ''}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </span>
          ) : "Create Room"}
        </Button>
        <Link href="/questions" className="text-center mt-2 text-primary hover:underline">
          Manage Questions
        </Link>
      </Form>
    </section>
  )
}