"use client";
import * as React from "react";
import { styled, useTheme } from "@mui/material/styles";
import Boxes from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import CssBaseline from "@mui/material/CssBaseline";
import MuiAppBar, { AppBarProps as MuiAppBarProps } from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import List from "@mui/material/List";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import InboxIcon from "@mui/icons-material/MoveToInbox";
import MailIcon from "@mui/icons-material/Mail";
import { io, Socket } from "socket.io-client";
import "./a.css";
import { useEffect, useState, useRef } from "react";
import axios from "axios";

import { Box, HStack } from "@chakra-ui/react";
import { Editor } from "@monaco-editor/react";
import LanguageSelector from "./LanguageSelector";
import { CODE_SNIPPETS } from "./constants";
import { ChakraProvider } from "@chakra-ui/react";
import themes from "./themes.js";
import Output from "./Output";
import * as monaco from 'monaco-editor';

const drawerWidth = 240;

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create("margin", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}));

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})<AppBarProps>(({ theme, open }) => ({
  transition: theme.transitions.create(["margin", "width"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: "flex-end",
}));

interface User {
  _id: string;
}
export const initialState: User = {
  _id: "",
};

export default function PersistentDrawerLeft() {
  const [textValue, setTextValue] = useState("");
  const [user, setuser] = useState<User>(initialState);
  const [showDialog, setShowDialog] = useState(false);
  const isRemoteUpdateRef = useRef(false);
  const [roomID, setRoomID] = useState("");
  const socket = useRef<Socket | null>(null);
  const [myremote, setmyremote] = useState(false);
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);

  const editorRef = useRef();
  type Language = keyof typeof CODE_SNIPPETS; 

  const [language, setLanguage] = useState<Language>("javascript");
  

  const onMount = (editor: any) => {
    editorRef.current = editor;
    editor.focus();
  };

  const onSelect = (language: Language) => {
    setLanguage(language);
    setTextValue(CODE_SNIPPETS[language]);
    socket.current!.emit("send-lang", {
      room:roomID,
      langu:language,
    });
  };

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleChange = (value: string | undefined, ev: monaco.editor.IModelContentChangedEvent) => {
    if (value !== undefined) {
      setmyremote(true);
      setTextValue(value);
    }
  };

  useEffect(() => {
    socket.current = io("http://localhost:5000");
    const checkUser = async () => {
      const res = await axios.get("/api/users/me");

      setuser(res.data.data);
    };

    checkUser();

    return () => {
      socket.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    console.log("user",user)
   
      console.log("user adding ....")
      socket.current!.emit("add-user", roomID);
  
  }, [roomID]);

  useEffect(() => {
    console.log("inner send", myremote);
    if (!isRemoteUpdateRef.current && myremote) {
      console.log("danger");
      socket.current!.emit("send-msg", {
        value: textValue,
        room: roomID,
      });
    } else {
      isRemoteUpdateRef.current = false;
    }
  }, [textValue]);

  useEffect(() => {
    if (socket.current) {
      socket.current.on("msg-recieve", (value) => {
        isRemoteUpdateRef.current = true;

        setTextValue(value);
        setmyremote(false);
      });
    }
  }, []);
  useEffect(() => {
    if (socket.current) {
      socket.current.on("lang-recieve", (langu) => {
        
        setLanguage(langu)
       
        
      });
    }
  }, []);
  useEffect(()=>{
    setTextValue(CODE_SNIPPETS[language]);
  },[language])

  const toggleDialog = () => {
    setShowDialog(!showDialog);
  };

  const handleCreateOrJoinRoom: React.FormEventHandler<HTMLFormElement> = (
    event
  ) => {
    event.preventDefault();
    const target = event.target as typeof event.target & {
      roomid: { value: string };
    };
    const roomInput = target.roomid.value;
    if (roomInput) {
      localStorage.setItem("roomID", roomInput);
      setRoomID(roomInput);
      console.log("room added",roomID)
      // Emit room join/create event to the server
      socket.current!.emit("join-room", roomInput);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRoomID = localStorage.getItem("roomID");
      if (storedRoomID) {
        setRoomID(storedRoomID);
      }
    }
  }, []);

  const leave = () => {
    socket.current?.emit("leave-room", roomID);
    localStorage.removeItem("roomID");
    setRoomID(""); // Clear the roomID state
    // Notify the server that the user is leaving the room
  };

  return (
    <>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppBar position="fixed" open={open} className="hellow">
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerOpen}
              edge="start"
              sx={{ mr: 2, ...(open && { display: "none" }) }}
            >
              <MenuIcon />
            </IconButton>
            <div>
              <div className="upContainer">
                <div className="i1">c</div>
                <div className="i2">JAVA</div>
                <div className="i3">C++</div>
                <div className="i4">PYTHON</div>
                <button className="i5" onClick={toggleDialog}>
                  {" "}
                  CONTACT US
                </button>
                <button className="i5" onClick={leave}>
                  {" "}
                  Leave Now
                </button>
              </div>
            </div>
          </Toolbar>
        </AppBar>
        <Drawer
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
          variant="persistent"
          anchor="left"
          open={open}
        >
          <DrawerHeader>
            <IconButton onClick={handleDrawerClose}>
              {theme.direction === "ltr" ? (
                <ChevronLeftIcon />
              ) : (
                <ChevronRightIcon />
              )}
            </IconButton>
          </DrawerHeader>
          <Divider />
          <List>
            {["Inbox", "Starred", "Send email", "Drafts"].map((text, index) => (
              <ListItem key={text} disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    {index % 2 === 0 ? <InboxIcon /> : <MailIcon />}
                  </ListItemIcon>
                  <ListItemText primary={text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
          <List>
            {["All mail", "Trash", "Spam"].map((text, index) => (
              <ListItem key={text} disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    {index % 2 === 0 ? <InboxIcon /> : <MailIcon />}
                  </ListItemIcon>
                  <ListItemText primary={text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>
        <Main open={open}>
          <DrawerHeader />
          <div>
          <ChakraProvider theme={themes}>
            <Box>
              <HStack spacing={4}>
                <Box w="50%">
                  <LanguageSelector language={language} onSelect={onSelect} />
                  <Editor
                    options={{
                      minimap: {
                        enabled: false,
                      },
                    }}
                    height="75vh"
                    theme="vs-dark"
                    language={language}
                    defaultValue={CODE_SNIPPETS[language]}
                    onMount={onMount}
                    value={textValue}
                    onChange={handleChange}
                  />
                </Box>
                <Output editorRef={editorRef} language={language} />
              </HStack>
            </Box>
            </ChakraProvider>
          </div>
        </Main>
      </Box>
      {showDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className="dialog-content">
              <h2>Connect</h2>
              <form onSubmit={handleCreateOrJoinRoom}>
                <div className="form-row">
                  <label htmlFor="workEmail">Work Email:</label>
                  <input type="text" id="workEmail" name="roomid" required />
                </div>
                <div className="form-row">
                  <button type="submit">use rommmi d</button>
                </div>
              </form>
              {/* Close dialog button */}
              <button className="close-btn" onClick={toggleDialog}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
