// src/pages/_app.js
import "@/styles/globals.css";
import { AuthProvider } from "@/context/auth";
import { PlayerContextProvider } from "@/context/player";
import { SocketContextProvider } from "@/context/socket";
import { GameProvider } from "@/context/game";
import Toaster from "@/components/Toaster";
import { Montserrat } from "next/font/google";
import Head from "next/head";
import clsx from "clsx";

const montserrat = Montserrat({ subsets: ["latin"] });

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="shortcut icon" href="/icon.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="description" content="Rahoot - An open-source quiz platform" />
        <title>Rahoot - Interactive Quiz Platform</title>
      </Head>
      <AuthProvider>
        <SocketContextProvider>
          <PlayerContextProvider>
            <GameProvider>
              <main
                className={clsx(
                  "text-base-[8px] flex flex-col min-h-screen",
                  montserrat.className,
                )}
              >
                <Component {...pageProps} />
              </main>
              <Toaster />
            </GameProvider>
          </PlayerContextProvider>
        </SocketContextProvider>
      </AuthProvider>
    </>
  );
}