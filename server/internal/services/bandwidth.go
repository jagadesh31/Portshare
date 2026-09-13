package services

// bandwidth.go — async bandwidth persistence for the tunnel hot path.
//
// Every tunneled request used to block on a Postgres UPDATE before the
// response went out. Now the request path only touches memory (exact,
// synchronous, so limit checks stay precise) and queues a delta; a
// background flusher writes batched UPDATEs in one transaction every 5s.
//
// Single-writer rule: the DB bandwidth_used counter is ONLY ever advanced
// by flush deltas. persistClientLocked deliberately leaves bandwidth_used
// untouched on conflict (see client.go), so the two can never double-count.

import (
	"context"
	"sync"
	"time"
)

var bwPending = struct {
	sync.Mutex
	deltas map[string]int64
}{deltas: make(map[string]int64)}

func init() {
	go flushBandwidthLoop()
}

// queueBandwidth adds n bytes to the in-memory counter immediately and
// queues the delta for async persistence. Safe for the hot path: no I/O,
// only two short mutex critical sections.
func queueBandwidth(clientID string, n int64) {
	if n == 0 || clientID == "" {
		return
	}
	clientStore.Lock()
	if client, ok := clientStore.clients[clientID]; ok {
		client.BandwidthUsed += n
	}
	clientStore.Unlock()

	bwPending.Lock()
	bwPending.deltas[clientID] += n
	bwPending.Unlock()
}

func flushBandwidthLoop() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		flushBandwidth()
	}
}

func flushBandwidth() {
	bwPending.Lock()
	if len(bwPending.deltas) == 0 {
		bwPending.Unlock()
		return
	}
	batch := bwPending.deltas
	bwPending.deltas = make(map[string]int64, len(batch))
	bwPending.Unlock()

	if clientDatabase == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	tx, err := clientDatabase.BeginTx(ctx, nil)
	if err != nil {
		requeueBandwidth(batch)
		return
	}
	for id, delta := range batch {
		if _, err := tx.ExecContext(ctx,
			"UPDATE clients SET bandwidth_used = bandwidth_used + $1 WHERE id = $2",
			delta, id); err != nil {
			_ = tx.Rollback()
			requeueBandwidth(batch)
			return
		}
	}
	if err := tx.Commit(); err != nil {
		requeueBandwidth(batch)
	}
}

func requeueBandwidth(batch map[string]int64) {
	if len(batch) == 0 {
		return
	}
	bwPending.Lock()
	for id, delta := range batch {
		bwPending.deltas[id] += delta
	}
	bwPending.Unlock()
}
