import React, {useEffect, useState} from 'react';
import { Modal } from '../ModalNew/Modal';
import Peer from 'peerjs';
import './videochat.scss';

const stunServers = [
  { url: 'stun:stun.l.google.com:19302' },
  { url: 'stun:stun1.l.google.com:19302' },
  { url: 'stun:stun2.l.google.com:19302' },
  { url: 'stun:stun3.l.google.com:19302' },
  { url: 'stun:stun4.l.google.com:19302' },
  {
    url: 'turn:numb.viagenie.ca',
    credential: 'muazkh',
    username: 'webrtc@live.com',
  },
  {
    url: 'turn:192.158.29.39:3478?transport=udp',
    credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
    username: '28224511:1379330808',
  },
  {
    url: 'turn:192.158.29.39:3478?transport=tcp',
    credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
    username: '28224511:1379330808',
  },
];

const config = {
  host: 'haunted-vault-85408.herokuapp.com',
  path: '/peer-api',
  config: { iceServers: stunServers },
};

if (window.location.hostname === 'localhost') {
  config.port = 9000;
}


export function VideoChat({callNumber, myNumber, callStatus, setCallStatus}) {
  const [callState, setCallState] = useState({});
  const [peerState, setPeerState] = useState({});
  const [remoteStream, setRemoteStream] = useState(null);
  const [connection, setConnection] = useState({});

  useEffect(()=>{
    let peer;

    if(myNumber){
      peer = new Peer(myNumber, config);
      setPeerState({peer})
    }

    if(peer) {
      peer.on('call', async (call) => {
        const userMedia = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
        call.answer(userMedia);
        callListner(call);
      })

      peer.on('connection', (conn) => {
        conn.on('data', (data) => {
          if(data.type === 'endCall') {
            setCallState({});
            return;
          }
          setCallState({type:'incomingRequest', data: data.data});
          setConnection(conn);
        })
      })
    }
  }, [myNumber]);

  useEffect(()=>{
    if(callStatus.type === 'startCall') {
      const conn = peerState.peer.connect(callNumber);
      conn.on('open', ()=>{
        conn.send({type: 'request', data: myNumber});
      })

      conn.on('data', (data)=>{
        if(data.type === 'rejected') {
          setCallState({});
          setCallStatus({type: 'ended'});
        }
      })
      setConnection(conn);
    }
  }, [callStatus.type])


  async function call() {
    const callNumber = callState.data;
    const userMedia = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
    const call = peerState.peer.call(callNumber, userMedia);
    callListner(call);
  }

  function callListner(call) {
    let localStream;
    call.on('stream', (rStream) => {
      setCallStatus({type: 'started'});
      localStream = call.localStream;
      setRemoteStream(rStream)
    });

    call.on('close', () => {
      localStream.getTracks().forEach(element => {
        element.stop();
      });
      setCallState({});
    })
    setCallState({type: 'call', call: call});
  }

  function endCall() {
    if(callState.call) {
      callState.call.close();
    } else {
      setCallState({});
      setCallStatus({type: 'ended'});
      connection.send({type: 'endCall'})
    }
  }

  function reject() {
    connection.send({type: 'rejected'});
    setCallStatus({type: 'ended'});
    setCallState({});
  }

  return (
    <>
      <Modal className={callState?.type === 'incomingRequest' ? 'show':'hide'} reject={reject} accept={call}></Modal>
      <div className={`video-chat ${callState?.type === 'call' || callStatus.type === 'startCall' ? 'video-active' : 'video-hide'}`}>
        {callStatus.type === 'startCall' && <><div className='animate'/><div className='started-calling'>{callStatus.user.username.slice(0, 2)}</div></>}
        {callStatus.type !== 'startCall' && <video autoPlay ref={(video) => video && remoteStream ? video.srcObject = remoteStream : ''}></video>}
        <div className='video-chat-controll'>
          <i className="fas fa-microphone-alt-slash"></i>
          <i onClick={endCall} className="fas fa-phone-slash"></i>
        </div>
      </div>
    </>
  )
}
