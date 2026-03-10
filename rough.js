<div className="h-16 flex items-center justify-center gap-6 bg-slate-900/60 backdrop-blur-xl border-t border-slate-800">

        <button
          onClick={() => setShowChat((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700"
        >
          <MessageSquare size={16} />
          {showChat ? "Hide History" : "Show History"}
        </button>

        <button
          onClick={() => setCameraOn((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700"
        >
          {cameraOn ? <CameraOff size={16} /> : <Camera size={16} />}
          {cameraOn ? "Camera Off" : "Camera On"}
        </button>


        <button
          onClick={endViva}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-red-600 hover:bg-red-700"
        >
          <PhoneOff size={16} />
          End Viva
        </button>

      </div>




