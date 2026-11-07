// Unity tests for the offline ring buffer (Tech Spec §4.9: up to 100
// readings in RAM, replayed in original order, oldest dropped when full).
#include <unity.h>
#include "control/offline_buffer.h"

void setUp() {}
void tearDown() {}

void test_empty_buffer_pop_returns_false() {
    OfflineBuffer buf(5);
    SensorReading out;
    TEST_ASSERT_TRUE(buf.isEmpty());
    TEST_ASSERT_FALSE(buf.pop(out));
}

void test_fifo_order_preserved() {
    OfflineBuffer buf(5);
    for (int i = 0; i < 3; i++) {
        SensorReading r;
        r.timestampMs = 1000 + i;
        buf.push(r);
    }
    TEST_ASSERT_EQUAL(3, buf.size());

    SensorReading out;
    TEST_ASSERT_TRUE(buf.pop(out));
    TEST_ASSERT_EQUAL_UINT64(1000, out.timestampMs);
    TEST_ASSERT_TRUE(buf.pop(out));
    TEST_ASSERT_EQUAL_UINT64(1001, out.timestampMs);
    TEST_ASSERT_TRUE(buf.pop(out));
    TEST_ASSERT_EQUAL_UINT64(1002, out.timestampMs);
    TEST_ASSERT_TRUE(buf.isEmpty());
}

void test_push_marks_historical_true() {
    OfflineBuffer buf(5);
    SensorReading r;
    r.historical = false;
    buf.push(r);

    SensorReading out;
    buf.pop(out);
    TEST_ASSERT_TRUE(out.historical);
}

void test_capacity_of_100_default() {
    OfflineBuffer buf; // default capacity = OFFLINE_BUFFER_CAPACITY (100)
    TEST_ASSERT_EQUAL(100, buf.capacity());
}

void test_full_buffer_drops_oldest() {
    OfflineBuffer buf(3);
    for (int i = 0; i < 3; i++) {
        SensorReading r;
        r.timestampMs = i;
        buf.push(r);
    }
    TEST_ASSERT_TRUE(buf.isFull());

    SensorReading overflow;
    overflow.timestampMs = 999;
    buf.push(overflow); // should evict timestampMs=0

    TEST_ASSERT_EQUAL(3, buf.size());
    SensorReading out;
    buf.pop(out);
    TEST_ASSERT_EQUAL_UINT64(1, out.timestampMs); // oldest surviving entry
}

int main(int argc, char** argv) {
    UNITY_BEGIN();
    RUN_TEST(test_empty_buffer_pop_returns_false);
    RUN_TEST(test_fifo_order_preserved);
    RUN_TEST(test_push_marks_historical_true);
    RUN_TEST(test_capacity_of_100_default);
    RUN_TEST(test_full_buffer_drops_oldest);
    return UNITY_END();
}
