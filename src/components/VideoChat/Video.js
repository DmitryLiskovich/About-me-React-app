import React, {useRef, useEffect, useState} from 'react';
import Peer from 'peerjs';
import axios from 'axios';
import paper, {Path} from 'paper/dist/paper-core';
import './myChat.scss'
import TextChat from './TextChat';
import Modal from './Modal/Modal';

const callOptions={config: {'iceServers': [
	{ url: 'stun:stun.l.google.com:19302' },
]}
};

navigator.getUserMedia = ( navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

function wakeUp(){
	axios.get('https://rocky-reef-68087.herokuapp.com/email');
	// axios.get('http://localhost:8080/email');
}
let streamCache;
let callingUser;
setInterval(wakeUp, 300000);
let message;
let path;
const pathHistory = [];

export default function Chat(props) {
	const [state, setState] = useState({catchIt: false, calling: false, chatState: false, peer: new Peer(callOptions), localStream: null, peercall: null, rejected: false});
	const [videoStream, setVideoStream] = useState([]);
	const [selectedUser, setSelectedUser] = useState();
	const video = useRef(null);
	const draw = useRef(null);
	const name = props.user.name;
	const socket = props.socket;
	const [peers, setPeers] = useState({});

	useEffect(()=>{

		state.peer.on('open', function(peerID) {
			socket.send(peerID);
		});

		state.peer.on('connection', (user)=>{
			user.on('data', (data)=>{
				setState((state)=> ({...state, catchIt: true, peercall: user}));
			});
			setState((state)=> ({...state, peercall: user}));
		})

		socket.on('message', async (data)=>{
			delete data[name];
			setPeers(data);
		})

		state.peer.on('call', function(call) {
			if(navigator.getUserMedia){
				navigator.getUserMedia({video: true, audio: false}, (stream)=>{
					call.answer(stream);
					callingUser = call.peer;
					call.on('close', (e)=>{
						stream.getTracks().forEach(track => track.stop());
						setState((state)=> ({...state, calling: false}));
					})
					call.on('stream', (remoteStream)=> setRemoteStream(remoteStream, stream))
					setState((state)=> ({...state, catchIt: false, calling: true, peercall: call}))
				}, error);
			}else{
				call.close();
			}
		});

		paper.setup(draw.current);

		draw.current.addEventListener('mousedown', onMouseDown);

		function onMouseDown(event) {
			if (path) {
				path.selected = false;
			}

			console.log(pathHistory);

			if(event.button === 2 && path){
				pathHistory.forEach(item=> item.remove());
			}

		
			path = new Path({
				strokeColor: '#152238',
				selected: true
			});

			pathHistory.push(path);

			draw.current.addEventListener('mousemove', onMouseDrag);
			draw.current.addEventListener('mouseup', onMouseUp);
		}
		
		function onMouseDrag(event) {
			if(path && event.layerX > 0){
				path.add(event.layerX, event.layerY);
			}
		}
		
		function onMouseUp(event) {
			if(path){
				path.simplify();
				path.selected = false;
			}
			draw.current.removeEventListener('mousemove', onMouseDrag);
			draw.current.removeEventListener('mouseup', onMouseUp);
		}
}, []);

useEffect(()=>{
	if(selectedUser){
		setState((state)=> ({...state, chatState: true}));
	}else{
		setState((state)=> ({...state, chatState: false}));
	}
}, [selectedUser]);

	function callAnswer(e){
		callingUser = e.currentTarget.parentElement.parentElement.getAttribute('data-number');
		const connect = state.peer.connect(callingUser);
		connect.on('open', ()=>{
			connect.on('data', (data)=>{
				if(data !== 'rejected'){
					if(navigator.getUserMedia){
						navigator.getUserMedia({video: true, audio: false}, (stream)=>{
							let peer = state.peer.call(callingUser, stream);
							peer.on('stream', (remoteStream)=> setRemoteStream(remoteStream, stream))
							peer.on('close', (e)=>{
								stream.getTracks().forEach(track => track.stop());
								setState((state)=> ({...state, calling: false}));
							})
							setState((state)=> ({...state, calling: true, peercall: peer}));
						}, error);
					}else{
						message = "You don't have web camera or you have http connection";
						setState((state)=> ({...state, rejected: true}))
						setTimeout(()=>{
							setState((state)=> ({...state, rejected: false}))
						}, 5000);
						return;
					}
				}else if(data === 'rejected'){
					message = 'Your call has been rejected';
					setState((state)=> ({...state, rejected: true}))
					setTimeout(()=>{
						setState((state)=> ({...state, rejected: false}))
					}, 5000);
				}
			});
			connect.send('request')
		});

	}
	function setRemoteStream(streamRemote, stream){
		stream.getAudioTracks().enabled = false;
		video.current.srcObject = stream;
		if(streamRemote !== streamCache){
			setVideoStream((state)=> ([...state, streamRemote]));
			streamCache = streamRemote;
		}
	}

	function reject(){
		state.peercall.send('rejected');
		setState((state)=> ({...state, calling: false, catchIt: false, peercall: null}));
	}

	function confirm(){
		state.peercall.send('accepted');
		setState((state)=> ({...state, calling: false, catchIt: false, peercall: null}));
	}

	function error(e){
		alert(`Ошибка: ${e}`)
	}

	function checkUserToCall(e){
		if(e.target.tagName !== 'UL' && e.target.className !== 'calling' && e.target.tagName !== 'I' && e.target.className !== 'calling pulse-button'){
			let listTarget = e.target;
			while(!listTarget.getAttribute('data-name')){
				listTarget = listTarget.parentElement;
			}
			const userConnection = {};
			userConnection[listTarget.getAttribute('data-name')] = listTarget.getAttribute('data-number');
			setSelectedUser(userConnection);
		}
	}

	return (
		<div className="App">
			<canvas id='draw' ref={draw}></canvas>
			{state.rejected && <Modal message={message}></Modal>}
			<div className={`users-list ${state.calling || state.chatState ? 'hidden' : ''}`}>
				<ul onClick={checkUserToCall}>
					<li className='header'><h1>Users List</h1><i className="far fa-comments chat-change" onClick={()=>setState({...state, chatState: true})}></i></li>
					{Object.keys(peers).map((item, index)=> {
						return(
							<li data-name={item} className={`${selectedUser && selectedUser[item] && 'active'}`} data-number={peers[item]} key={index}><div className='user-name'>{item.slice(0, 2)}</div><p>{item}</p><div className="button">
									<div onClick={state.catchIt ? confirm : callAnswer} className={`calling ${state.catchIt && state.peercall.peer === peers[item] ? 'pulse-button' : ''}`}>
										<i className="fas fa-phone"></i>
									</div>
									{state.catchIt && state.peercall.peer === peers[item] && (<div onClick={reject} className={`reject calling`}>
										<i className="fas fa-phone-slash"></i>
									</div>)}
								</div>
								</li>
						)})
					}
				</ul>
			</div>
			{state.calling &&
				<div className={`video-chat ${!state.calling && 'hidden'}`}>
					<Video></Video> 
				</div>
			}
			{!state.calling &&
			<>
				<i onClick={()=>setState((state)=> ({...state, chatState: false}))} className={`fas fa-times close-button ${!state.chatState ? 'hidden' : ''}`}></i>
				<div className={`text-chat ${!state.chatState && 'hidden'}`}>
					<TextChat selectedUser={name} socket={socket}></TextChat>
				</div>
			</>
			}
		</div>
	);

	function Video(){
		return(
			<>
				<div className="chat-section">
					<div className='chat-wrap'>
						<div className='my_wrapp'>
							<video muted className='my' ref={video} autoPlay></video>
						</div>
						<div className='chat'>
							{videoStream.map((item, index)=> (item.active ? <video className="video" autoPlay key={index} ref={currentVideoEl => currentVideoEl ? currentVideoEl.srcObject = item : ''}></video> : ''))}
						</div>
						<div className='button-section'>
							<div onClick={()=> state.peercall ? state.peercall.close() : state.peer.close()} className="reject calling"><i className="fas fa-phone-slash"></i></div>
							<i className="fas fa-microphone"></i>
							<i className="fas fa-volume-up"></i>
						</div>
					</div>
				</div>
			</>
		)
	}
}