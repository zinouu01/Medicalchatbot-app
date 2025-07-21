import Sidebar from "./Sidebar"
import { Outlet } from "react-router-dom"
import { useState } from "react"
import { Menu } from "lucide-react"

const Layout=()=> {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen">
      {sidebarOpen && <Sidebar />}
      <div className="flex-1 bg-gray-900 text-white relative">
        {/* Fancy icon button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-4 left-4 z-20 bg-gray-800 hover:bg-gray-700 p-2 rounded-md"
        >
          <Menu size={20} />
        </button>
        <div className=" h-full">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
export default Layout