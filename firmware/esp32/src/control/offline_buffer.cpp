#include "offline_buffer.h"

OfflineBuffer::OfflineBuffer(int capacity)
    : capacity_(capacity > 0 ? capacity : 1) {
    buf_ = new SensorReading[capacity_];
}

OfflineBuffer::~OfflineBuffer() {
    delete[] buf_;
}

void OfflineBuffer::push(const SensorReading& reading) {
    SensorReading entry = reading;
    entry.historical = true;

    if (count_ == capacity_) {
        // Full: drop the oldest to make room (never block capture).
        head_ = (head_ + 1) % capacity_;
        count_--;
    }
    int writeIndex = (head_ + count_) % capacity_;
    buf_[writeIndex] = entry;
    count_++;
}

bool OfflineBuffer::isEmpty() const { return count_ == 0; }
bool OfflineBuffer::isFull() const { return count_ == capacity_; }
int OfflineBuffer::size() const { return count_; }
int OfflineBuffer::capacity() const { return capacity_; }

bool OfflineBuffer::pop(SensorReading& out) {
    if (count_ == 0) return false;
    out = buf_[head_];
    head_ = (head_ + 1) % capacity_;
    count_--;
    return true;
}

void OfflineBuffer::clear() {
    head_ = 0;
    count_ = 0;
}
