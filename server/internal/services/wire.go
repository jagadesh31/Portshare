package services

// wire.go — binary tunnel framing.
//
// Protocol v2 frame (WebSocket binary message):
//
//	[4-byte big-endian metaLen][metaLen bytes of JSON metadata][raw body bytes]
//
// This removes the ~33% base64 size tax and the encode/decode CPU cost of
// stuffing bodies into JSON. The JSON metadata keeps the same field names as
// the legacy protocol so both sides stay simple.
//
// Compatibility: clients request v2 with `?proto=2` on /tunnel/connect. An
// older server ignores the param and keeps speaking legacy JSON, so both
// sides auto-detect (see the read loops: Text=legacy, Binary=v2).

import (
	"encoding/binary"
	"errors"
)

const maxTunnelMetaBytes = 1 << 20 // 1 MB is ample for headers

var errInvalidTunnelFrame = errors.New("invalid tunnel frame")

// tunnelMeta is the JSON header for both directions. Body is NEVER included
// here — it travels as the raw frame tail.
type tunnelMeta struct {
	ID      string              `json:"id"`
	Method  string              `json:"method,omitempty"`
	Path    string              `json:"path,omitempty"`
	Headers map[string][]string `json:"headers,omitempty"`
	Status  int                 `json:"status,omitempty"`
	Error   string              `json:"error,omitempty"`
}

func encodeTunnelFrame(meta, body []byte) []byte {
	frame := make([]byte, 4+len(meta)+len(body))
	binary.BigEndian.PutUint32(frame[:4], uint32(len(meta)))
	copy(frame[4:], meta)
	copy(frame[4+len(meta):], body)
	return frame
}

func decodeTunnelFrame(data []byte) (meta, body []byte, err error) {
	if len(data) < 4 {
		return nil, nil, errInvalidTunnelFrame
	}
	metaLen := int(binary.BigEndian.Uint32(data[:4]))
	if metaLen < 0 || metaLen > maxTunnelMetaBytes || 4+metaLen > len(data) {
		return nil, nil, errInvalidTunnelFrame
	}
	return data[4 : 4+metaLen], data[4+metaLen:], nil
}
