import React, {useEffect, useState, useContext} from 'react';
import './chatLayout.scss'
import { TextChat } from './TextChat/TextChat';
import { VideoChat } from './VideoChat/VideoChat';
import { InitialScreen } from './InitialScreen/InitialScreen';
import axios from 'axios';
import { UserList } from './UserList/UserList';
import { PageState } from './Login/Auth';
import { Modal } from './ModalNew/Modal';

const envURL = window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://ghostly-eyeballs-06543.herokuapp.com'

export const UserInfo = React.createContext()

export default function Chat() {
  document.title = 'Dmitry Liskovich | Chat';
  const [userList, setUserList] = useState([]);
  const [userInfo, setUserInfo] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [callStatus, setCallStatus] = useState('');
  const [userListIsOpen, setUserListIsOpen] = useState(false);
  const pageState = useContext(PageState);

  async function offLine() {
    await axios.get(envURL+'/offline?st=false', {withCredentials: true});
  }

  async function online() {
    await axios.get(envURL+'/offline?st=true', {withCredentials: true});
  }

  useEffect(()=>{
    (async ()=>{
      const user = await axios.get(envURL+'/users', {withCredentials: true});
      const users = await axios.get(envURL+'/allUsers', {withCredentials: true});
      setUserList(users.data);
      setUserInfo(user.data);
    })();

    window.addEventListener('beforeunload', offLine);
    if(localStorage.getItem('logined')){
      window.addEventListener('load', online);
    }

    return () => {
      window.removeEventListener('load', online);
      window.removeEventListener('beforeunload', offLine);
    }
  }, []);

	return (
    <>
    {callStatus.type === 'request' && <Modal/>}
      <div className="chat-wrapper">
        <i onClick={() => setUserListIsOpen((state) => !state)} className={`fas fa-arrow-left ${userListIsOpen ? 'open' : 'close'}`}></i>
        <UserInfo.Provider value={userInfo}>
          <UserList userListIsOpen={userListIsOpen} usersList={userList} pageState={pageState} setSelectedUser={setSelectedUser}/>
          {!selectedUser && <InitialScreen></InitialScreen>}
          {selectedUser &&<TextChat setCallStatus={setCallStatus} pageState={pageState} selectedUser={selectedUser}></TextChat>}
          <VideoChat setCallStatus={setCallStatus} callStatus={callStatus} pageState={pageState} callNumber={selectedUser?.id} myNumber={userInfo.id} ></VideoChat>
        </UserInfo.Provider>
      </div>
    </>
	);
}
