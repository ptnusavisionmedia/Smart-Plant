#pragma once
#include "../sensors/sensors.h"
#include "../../include/config.h"

// ---------------------------------------------------------------------------
// Fixed-capacity ring buffer of SensorReading snapshots captured while the
// MQTT connection is down (Tech Spec §4.9 "Offline & Reconnect"). On
// reconnect the device replays them in original order with their original
// timestamps and `historical=true`. Capped at OFFLINE_BUFFER_CAPACITY (100);
// once full, the oldest buffered reading is dropped to make room so that
// capturing a new reading never blocks or fails.
//
// No Arduino dependency — plain RAM array, safe for native unit tests.
// ---------------------------------------------------------------------------
class OfflineBuffer {
public:
    explicit OfflineBuffer(int capacity = OFFLINE_BUFFER_CAPACITY);
    ~OfflineBuffer();

    OfflineBuffer(const OfflineBuffer&) = delete;
    OfflineBuffer& operator=(const OfflineBuffer&) = delete;

    // Pushes a reading, marking it historical=true (it will be replayed
    // later). When full, the oldest entry is evicted first.
    void push(const SensorReading& reading);

    bool isEmpty() const;
    bool isFull() const;
    int size() const;
    int capacity() const;

    // Pops the oldest buffered reading (FIFO replay order). Returns false
    // (and leaves `out` untouched) if the buffer is empty.
    bool pop(SensorReading& out);

    void clear();

private:
    SensorReading* buf_;
    int capacity_;
    int head_ = 0; // index of the oldest entry
    int count_ = 0;
};
