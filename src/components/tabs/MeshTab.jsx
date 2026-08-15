import React from 'react';
import MeshChat from '../MeshChat';

export default function MeshTab({ user, gpsCoords, handleSendSOS }) {
  return (
    <div className="space-y-3 animate-fadeIn">
      <MeshChat 
        user={user} 
        gpsCoords={gpsCoords} 
        onTriggerSOS={handleSendSOS} 
      />
    </div>
  );
}
