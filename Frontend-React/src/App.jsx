import React, { useState, useEffect } from "react";
import io from "socket.io-client";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: ""
  });

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Chat state
  const [socket, setSocket] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isRoomJoined, setIsRoomJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinPrivate, setShowJoinPrivate] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: "", description: "", isPrivate: false });
  const [privateRoomKey, setPrivateRoomKey] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      verifyToken(token);
    }
  }, []);

  // Initialize socket when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem("token");
      const newSocket = io("http://localhost:5000", {
        auth: { token }
      });

      newSocket.on("connect", () => {
        console.log("Connected to server");
        loadRooms();
        
        // Re-join current room if we were in one
        if (currentRoom) {
          console.log("Reconnecting - rejoining room:", currentRoom.name);
          newSocket.emit("join-room", { roomId: currentRoom._id });
        }
      });

      newSocket.on("room-joined", (data) => {
        console.log("Room joined successfully:", data);
        setIsRoomJoined(true);
        // Room join confirmed by server
        if (data.messages) {
          setMessages(data.messages);
        }
      });

      newSocket.on("new-message", (messageData) => {
        console.log("New message received:", messageData);
        setMessages(prev => [...prev, messageData]);
        // Reload AI recommendations after receiving a message
        setTimeout(() => {
          loadAIRecommendations();
        }, 1000);
      });

      newSocket.on("user-joined", (data) => {
        console.log("User joined:", data);
      });

      newSocket.on("user-left", (data) => {
        console.log("User left:", data);
      });

      newSocket.on("error", (error) => {
        console.error("Socket error:", error);
        setError(error.message || "Socket error occurred");
        setTimeout(() => setError(""), 3000);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated, user, currentRoom]);

  const loadRooms = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/rooms", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRooms(data.rooms || []);
        
        // Auto-join first room if no current room
        if (data.rooms?.length > 0 && !currentRoom) {
          joinRoom(data.rooms[0]);
        }
      }
    } catch (error) {
      console.error("Error loading rooms:", error);
    }
  };

  const joinRoom = async (room) => {
    if (socket && room) {
      console.log("Joining room:", room.name, room._id);
      
      // Leave current room
      if (currentRoom) {
        console.log("Leaving current room:", currentRoom.name);
        socket.emit("leaveRoom", currentRoom._id);
      }

      setCurrentRoom(room);
      setMessages([]);
      setIsRoomJoined(false); // Reset join status
      
      // Join new room
      console.log("Emitting join-room event with roomId:", room._id);
      socket.emit("join-room", { roomId: room._id });
      
      // Load room messages
      await loadRoomMessages(room._id);
      
      // Load AI recommendations
      await loadAIRecommendations();
    } else {
      console.log("Cannot join room:", { hasSocket: !!socket, hasRoom: !!room });
    }
  };

  const loadRoomMessages = async (roomId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/rooms/${roomId}/messages`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const loadAIRecommendations = async () => {
    if (!currentRoom) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/ai/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ roomId: currentRoom._id })
      });

      if (response.ok) {
        const data = await response.json();
        setAiSuggestions(data.recommendations || []);
      }
    } catch (error) {
      console.error("Error loading AI recommendations:", error);
    }
  };

  const sendMessage = () => {
    if (!socket) {
      console.log("Cannot send message: No socket connection");
      setError("Not connected to server. Please refresh the page.");
      setTimeout(() => setError(""), 3000);
      return;
    }
    
    if (!messageInput.trim()) {
      console.log("Cannot send message: Empty message");
      return;
    }
    
    if (!currentRoom) {
      console.log("Cannot send message: No room selected");
      setError("Please select a room first");
      setTimeout(() => setError(""), 3000);
      return;
    }
    
    if (!isRoomJoined) {
      console.log("Cannot send message: Room not joined yet, rejoining...");
      // Try to rejoin the room
      socket.emit("join-room", { roomId: currentRoom._id });
      setError("Joining room, please try again in a moment...");
      setTimeout(() => setError(""), 3000);
      return;
    }

    console.log("Sending message:", messageInput.trim(), "to room:", currentRoom._id);

    const messageData = {
      content: messageInput.trim()
    };

    socket.emit("send-message", messageData);
    setMessageInput("");
    
    // Reload AI recommendations after sending
    setTimeout(() => {
      loadAIRecommendations();
    }, 1000);
  };

  const createRoom = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newRoomData)
      });

      if (response.ok) {
        const data = await response.json();
        setShowCreateRoom(false);
        setNewRoomData({ name: "", description: "", isPrivate: false });
        
        // Auto-join the created room
        const newRoom = data.room || data;
        
        // If the room is private, attach the accessKey to the room object
        if (data.accessKey) {
          newRoom.accessKey = data.accessKey;
        }
        
        setRooms(prev => [...prev, newRoom]);
        
        // Join the room automatically
        joinRoom(newRoom);
        
        if (newRoom.isPrivate && newRoom.accessKey) {
          // Show success message with access key
          setSuccess(`Private room created! Access Key: ${newRoom.accessKey}`);
          setTimeout(() => setSuccess(""), 5000);
        } else {
          setSuccess("Room created successfully!");
          setTimeout(() => setSuccess(""), 3000);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to create room");
        setTimeout(() => setError(""), 3000);
      }
    } catch (error) {
      console.error("Error creating room:", error);
      setError("Failed to create room");
      setTimeout(() => setError(""), 3000);
    }
  };

  const joinPrivateRoom = async () => {
    if (!privateRoomKey.trim()) {
      setError("Please enter an access key");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/rooms/join-by-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ accessKey: privateRoomKey.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        const joinedRoom = data.room || data;
        
        setShowJoinPrivate(false);
        setPrivateRoomKey("");
        
        // Add room to list if not already there
        setRooms(prev => {
          const exists = prev.find(room => room._id === joinedRoom._id);
          if (exists) return prev;
          return [...prev, joinedRoom];
        });
        
        // Join the room
        joinRoom(joinedRoom);
        
        setSuccess("Successfully joined private room!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || errorData.error || "Invalid access key");
        setTimeout(() => setError(""), 3000);
      }
    } catch (error) {
      console.error("Error joining private room:", error);
      setError("Failed to join room. Please try again.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const verifyToken = async (token) => {
    try {
      const response = await fetch("http://localhost:5000/api/auth/me", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem("token");
      }
    } catch (error) {
      console.error("Token verification failed:", error);
      localStorage.removeItem("token");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const url = `http://localhost:5000${endpoint}`;
      
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : { email: formData.email, password: formData.password, username: formData.username };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(isLogin ? "Login successful!" : "Account created successfully!");
        if (data.token) {
          localStorage.setItem("token", data.token);
          setUser(data.user);
          setIsAuthenticated(true);
        }
        setFormData({ email: "", password: "", username: "" });
      } else {
        setError(data.message || data.error || "Something went wrong");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to connect to server.");
    }

    setIsLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setUser(null);
  };

  if (isAuthenticated) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-linear-to-br from-purple-50 via-blue-50 to-pink-50'}`}>
        {/* Header */}
        <div className={`shadow-lg border-b transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className={`text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent`}>
              ChatWE
            </h1>
            <div className="flex items-center space-x-4">
              <span className={isDarkMode ? "text-gray-200" : "text-gray-700"}>Welcome, {user?.username}!</span>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'text-yellow-400 hover:bg-gray-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Main Chat Layout */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-150px)]">
            
            {/* Rooms Sidebar */}
            <div className={`lg:col-span-1 rounded-xl shadow-lg p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Rooms</h2>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setShowCreateRoom(true)}
                    className="bg-purple-500 text-white p-2 rounded-lg hover:bg-purple-600 transition-colors"
                    title="Create Room"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => setShowJoinPrivate(true)}
                    className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
                    title="Join Private Room"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                {rooms.map((room) => (
                  <div
                    key={room._id}
                    onClick={() => joinRoom(room)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors border-l-4 ${
                      currentRoom?._id === room._id
                        ? isDarkMode
                          ? "bg-purple-900 border-purple-500 text-white"
                          : "bg-purple-50 border-purple-500 text-purple-800"
                        : isDarkMode
                          ? "bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-300"
                          : "bg-gray-50 border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{room.name}</div>
                      {room.isPrivate && (
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                    </div>
                    <div className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {room.description || "No description"}
                    </div>
                    <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {room.memberCount || 0} members
                    </div>
                  </div>
                ))}
                
                {rooms.length === 0 && (
                  <div className={`text-center py-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    <p>No rooms available</p>
                    <button 
                      onClick={() => setShowCreateRoom(true)}
                      className="text-purple-500 hover:text-purple-400 text-sm mt-2"
                    >
                      Create the first room
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`lg:col-span-3 rounded-xl shadow-lg flex flex-col ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              
              {/* Chat Header */}
              <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                {/* Success/Error Messages */}
                {success && (
                  <div className="mb-3 p-3 bg-green-500 bg-opacity-20 border border-green-500 rounded-lg text-green-300 text-sm">
                    {success}
                  </div>
                )}
                {error && (
                  <div className="mb-3 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg text-red-300 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {currentRoom ? currentRoom.name : "Select a room"}
                      {currentRoom?.isPrivate && (
                        <span className="ml-2 text-blue-400">
                          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </span>
                      )}
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {currentRoom 
                        ? `${currentRoom.description || "No description"} • ${currentRoom.memberCount || 0} members`
                        : "Choose a room to start chatting"
                      }
                    </p>
                    {currentRoom?.isPrivate && currentRoom?.accessKey && (
                      <div className={`mt-2 p-2 rounded-lg ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-blue-50 border border-blue-200'}`}>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>Access Key:</p>
                        <p className={`text-sm font-mono px-2 py-1 rounded border inline-block ${isDarkMode ? 'text-blue-200 bg-gray-800 border-gray-600' : 'text-blue-800 bg-white border-gray-300'}`}>
                          {currentRoom.accessKey}
                        </p>
                        <button 
                          onClick={() => navigator.clipboard.writeText(currentRoom.accessKey)}
                          className={`ml-2 text-xs underline ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                  {currentRoom && (
                    <div className="flex space-x-2">
                      <button 
                        onClick={loadAIRecommendations}
                        className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        title="Refresh AI Suggestions"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto" style={{maxHeight: "calc(100vh - 350px)"}}>
                {currentRoom ? (
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className={`text-center py-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        <p>No messages yet. Be the first to say hello! 👋</p>
                      </div>
                    )}
                    
                    {messages.map((message, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-linear-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
                          {message.sender?.username?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{message.sender?.username || "Unknown"}</span>
                            <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                              {new Date(message.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className={`rounded-lg p-3 mt-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-800'}>{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`flex items-center justify-center h-full ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    <div className="text-center">
                      <svg className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-lg font-medium">Welcome to ChatWE!</p>
                      <p className="text-sm">Select a room to start chatting</p>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Suggestions */}
              {currentRoom && aiSuggestions.length > 0 && (
                <div className={`px-4 py-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div className={`rounded-lg p-3 ${isDarkMode ? 'bg-gray-900 bg-opacity-50' : 'bg-linear-to-r from-purple-50 to-blue-50'}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>🤖 AI Suggestions</span>
                      <button 
                        onClick={loadAIRecommendations}
                        className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600 transition-colors"
                      >
                        Refresh
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {aiSuggestions.map((suggestion, index) => (
                        <button 
                          key={index}
                          onClick={() => setMessageInput(suggestion)}
                          className={`px-3 py-1 rounded-full text-sm transition-colors ${isDarkMode ? 'bg-gray-700 text-purple-300 hover:bg-gray-600 border border-gray-600' : 'bg-white text-purple-600 hover:bg-purple-50 border border-purple-200'}`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Message Input */}
              {currentRoom && (
                <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Type your message..."
                      className={`flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 focus:ring-purple-500' : 'border-gray-300 focus:ring-purple-500'}`}
                    />
                    <button 
                      onClick={sendMessage}
                      disabled={!messageInput.trim()}
                      className="bg-linear-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create Room Modal */}
        {showCreateRoom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`rounded-xl p-6 w-full max-w-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Create New Room</h3>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Room Name"
                  value={newRoomData.name}
                  onChange={(e) => setNewRoomData({...newRoomData, name: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 focus:ring-purple-500' : 'border-gray-300 focus:ring-purple-500'}`}
                />
                
                <textarea
                  placeholder="Room Description (optional)"
                  value={newRoomData.description}
                  onChange={(e) => setNewRoomData({...newRoomData, description: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg h-20 resize-none focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 focus:ring-purple-500' : 'border-gray-300 focus:ring-purple-500'}`}
                />
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newRoomData.isPrivate}
                    onChange={(e) => setNewRoomData({...newRoomData, isPrivate: e.target.checked})}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>Make this room private (requires access key)</span>
                </label>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateRoom(false)}
                  className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={createRoom}
                  disabled={!newRoomData.name.trim()}
                  className="flex-1 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join Private Room Modal */}
        {showJoinPrivate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`rounded-xl p-6 w-full max-w-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Join Private Room</h3>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter access key"
                  value={privateRoomKey}
                  onChange={(e) => setPrivateRoomKey(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 focus:ring-blue-500' : 'border-gray-300 focus:ring-blue-500'}`}
                />
                
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Enter the access key provided by the room creator to join a private room.
                </p>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowJoinPrivate(false)}
                  className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={joinPrivateRoom}
                  disabled={!privateRoomKey.trim()}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-linear-to-br from-purple-50 via-blue-50 to-pink-50'} flex items-center justify-center`}>
      <div className={`rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1"></div>
            <h1 className="flex-1 text-4xl font-bold bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              ChatWE
            </h1>
            <div className="flex-1 flex justify-end">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'text-yellow-400 hover:bg-gray-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Modern Chat Experience</p>
          
          <div className={`mt-4 p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-200'}`}>
            <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>Demo Accounts:</p>
            
            <div className={`mb-3 p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-blue-100'}`}>
              <p className={`text-xs font-semibold ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>Account 1:</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-blue-600'}`}>Email: demo@chatwe.com</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-blue-600'}`}>Password: demo123</p>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    email: "demo@chatwe.com",
                    password: "demo123",
                    username: ""
                  });
                  setIsLogin(true);
                }}
                className={`mt-2 text-xs px-3 py-1 rounded-md transition-colors ${isDarkMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
              >
                Use Account 1
              </button>
            </div>

            <div className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-blue-100'}`}>
              <p className={`text-xs font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>Account 2:</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-blue-600'}`}>Email: demo2@chatwe.com</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-blue-600'}`}>Password: demo123</p>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    email: "demo2@chatwe.com",
                    password: "demo123",
                    username: ""
                  });
                  setIsLogin(true);
                }}
                className={`mt-2 text-xs px-3 py-1 rounded-md transition-colors ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
              >
                Use Account 2
              </button>
            </div>
          </div>
        </div>

        <div className={`flex mb-6 rounded-lg p-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              isLogin
                ? isDarkMode 
                  ? "bg-gray-600 text-purple-400 shadow-sm"
                  : "bg-white text-purple-600 shadow-sm"
                : isDarkMode
                  ? "text-gray-400 hover:text-purple-400"
                  : "text-gray-600 hover:text-purple-600"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              !isLogin
                ? isDarkMode 
                  ? "bg-gray-600 text-purple-400 shadow-sm"
                  : "bg-white text-purple-600 shadow-sm"
                : isDarkMode
                  ? "text-gray-400 hover:text-purple-400"
                  : "text-gray-600 hover:text-purple-600"
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className={`mb-4 p-3 border rounded-lg ${isDarkMode ? 'bg-red-900 bg-opacity-20 border-red-500 text-red-300' : 'bg-red-100 border-red-300 text-red-700'}`}>
            {error}
          </div>
        )}

        {success && (
          <div className={`mb-4 p-3 border rounded-lg ${isDarkMode ? 'bg-green-900 bg-opacity-20 border-green-500 text-green-300' : 'bg-green-100 border-green-300 text-green-700'}`}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <input
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 focus:ring-purple-500 placeholder-gray-400' : 'border-gray-300 focus:ring-purple-500'}`}
                required
              />
            </div>
          )}
          
          <div>
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 focus:ring-purple-500 placeholder-gray-400' : 'border-gray-300 focus:ring-purple-500'}`}
              required
            />
          </div>
          
          <div>
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 focus:ring-purple-500 placeholder-gray-400' : 'border-gray-300 focus:ring-purple-500'}`}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 text-white ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-linear-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 transform hover:scale-105"
            }`}
          >
            {isLoading 
              ? (isLogin ? "Signing In..." : "Creating Account...") 
              : (isLogin ? "Sign In" : "Create Account")
            }
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            {isLogin ? "New to ChatWE?" : "Already have an account?"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className={`ml-1 font-medium ${isDarkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}`}
            >
              {isLogin ? "Create Account" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
