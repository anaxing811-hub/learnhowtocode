/**
 * The Arduino compatibility layer.
 *
 * An Arduino sketch is just C++ with a library attached and two functions the
 * board's firmware calls for you. We can therefore compile a real sketch with
 * the same clang used by the C++ track, provided we supply:
 *
 *   1. the Arduino API (pinMode, digitalWrite, Serial, millis, …), and
 *   2. the `main()` that Arduino's own core hides from you.
 *
 * Rather than trying to drive the browser UI live from inside the WebAssembly
 * sandbox — which only has stdio — the API records a *timeline* of events
 * against a virtual clock and prints it to stdout. The board simulator in the
 * browser then replays that timeline in real time. That trade buys three
 * things a live binding would not: `delay(1000)` costs zero real seconds,
 * the run is deterministic, and the resulting timeline can be scrubbed.
 *
 * Input (button presses) is scripted: the harness passes a schedule on stdin
 * and `digitalRead` answers from it based on the virtual clock, so pressing a
 * button in the UI simply re-runs the sketch with an extra scheduled edge.
 */

export const ARDUINO_PRELUDE = String.raw`
// ---------------------------------------------------------------------------
// Arduino compatibility layer (provided by the lesson runner)
// ---------------------------------------------------------------------------
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cmath>
#include <string>
#include <vector>
#include <algorithm>

#define HIGH 0x1
#define LOW  0x0
#define INPUT 0x0
#define OUTPUT 0x1
#define INPUT_PULLUP 0x2
#define LED_BUILTIN 13
#define PI 3.1415926535897932384626433832795
#define A0 14
#define A1 15
#define A2 16
#define A3 17
#define A4 18
#define A5 19
#define DEC 10
#define HEX 16
#define OCT 8
#define BIN 2

typedef unsigned char byte;
typedef bool boolean;

// --- virtual clock ---------------------------------------------------------
static unsigned long __lhtc_micros = 0;
// How much sketch time to simulate before stopping. Overridable per lesson.
#ifndef LHTC_TIME_BUDGET_US
#define LHTC_TIME_BUDGET_US 6000000UL
#endif
#ifndef LHTC_MAX_EVENTS
#define LHTC_MAX_EVENTS 20000
#endif

static int __lhtc_event_count = 0;
static bool __lhtc_stop = false;

// NOTE: the record marker is written as the OCTAL escape \001, never \x01.
// A hex escape in C consumes *every* hex digit that follows it, so "\x01E"
// is the single character 0x1E with the 'E' swallowed — which silently
// corrupted the end-of-run record until it was spotted in the UI.
static void __lhtc_emit(const char* kind, long a, long b) {
    if (__lhtc_event_count++ > LHTC_MAX_EVENTS) { __lhtc_stop = true; return; }
    printf("\001%s %lu %ld %ld\n", kind, __lhtc_micros, a, b);
}

static void __lhtc_emit_text(const char* kind, const char* text) {
    if (__lhtc_event_count++ > LHTC_MAX_EVENTS) { __lhtc_stop = true; return; }
    // Text is emitted raw; the parser reads to end of line.
    printf("\001%s %lu %s\n", kind, __lhtc_micros, text);
}

static void __lhtc_advance(unsigned long us) {
    __lhtc_micros += us;
    if (__lhtc_micros >= LHTC_TIME_BUDGET_US) __lhtc_stop = true;
}

// --- pin state -------------------------------------------------------------
static const int __LHTC_PINS = 20;
static int __lhtc_mode[__LHTC_PINS];
static int __lhtc_digital[__LHTC_PINS];
static int __lhtc_analog_out[__LHTC_PINS];
static int __lhtc_analog_in[__LHTC_PINS];

// Scheduled input edges parsed from stdin: "<micros> <pin> <value>"
struct __LhtcEdge { unsigned long t; int pin; int value; };
static std::vector<__LhtcEdge> __lhtc_edges;

static void __lhtc_load_input() {
    char line[128];
    while (fgets(line, sizeof(line), stdin)) {
        unsigned long t; int pin, value;
        if (sscanf(line, "%lu %d %d", &t, &pin, &value) == 3) {
            __LhtcEdge e; e.t = t; e.pin = pin; e.value = value;
            __lhtc_edges.push_back(e);
        }
    }
    std::sort(__lhtc_edges.begin(), __lhtc_edges.end(),
              [](const __LhtcEdge& x, const __LhtcEdge& y){ return x.t < y.t; });
}

// --- digital / analog I/O --------------------------------------------------
void pinMode(int pin, int mode) {
    if (pin < 0 || pin >= __LHTC_PINS) return;
    __lhtc_mode[pin] = mode;
    // A pin configured with the internal pull-up idles HIGH.
    if (mode == INPUT_PULLUP) __lhtc_digital[pin] = HIGH;
    __lhtc_emit("M", pin, mode);
}

void digitalWrite(int pin, int value) {
    if (pin < 0 || pin >= __LHTC_PINS) return;
    value = value ? HIGH : LOW;
    if (__lhtc_digital[pin] != value) {
        __lhtc_digital[pin] = value;
        __lhtc_emit("D", pin, value);
    }
}

int digitalRead(int pin) {
    if (pin < 0 || pin >= __LHTC_PINS) return LOW;
    int value = (__lhtc_mode[pin] == INPUT_PULLUP) ? HIGH : LOW;
    for (size_t i = 0; i < __lhtc_edges.size(); ++i) {
        if (__lhtc_edges[i].pin == pin && __lhtc_edges[i].t <= __lhtc_micros)
            value = __lhtc_edges[i].value;
    }
    __lhtc_digital[pin] = value;
    return value;
}

void analogWrite(int pin, int value) {
    if (pin < 0 || pin >= __LHTC_PINS) return;
    if (value < 0) value = 0;
    if (value > 255) value = 255;
    __lhtc_analog_out[pin] = value;
    __lhtc_emit("A", pin, value);
}

int analogRead(int pin) {
    if (pin < 0 || pin >= __LHTC_PINS) return 0;
    int value = __lhtc_analog_in[pin];
    for (size_t i = 0; i < __lhtc_edges.size(); ++i) {
        if (__lhtc_edges[i].pin == pin && __lhtc_edges[i].t <= __lhtc_micros)
            value = __lhtc_edges[i].value;
    }
    __lhtc_emit("R", pin, value);
    return value;
}

// --- timing ----------------------------------------------------------------
void delay(unsigned long ms)             { __lhtc_advance(ms * 1000UL); }
void delayMicroseconds(unsigned int us)  { __lhtc_advance(us); }
unsigned long millis()                   { return __lhtc_micros / 1000UL; }
unsigned long micros()                   { return __lhtc_micros; }

// --- tone ------------------------------------------------------------------
void tone(int pin, unsigned int frequency)                    { __lhtc_emit("N", pin, (long)frequency); }
void tone(int pin, unsigned int frequency, unsigned long dur) { __lhtc_emit("N", pin, (long)frequency); delay(dur); __lhtc_emit("N", pin, 0); }
void noTone(int pin)                                          { __lhtc_emit("N", pin, 0); }

// --- math helpers ----------------------------------------------------------
long map(long x, long inMin, long inMax, long outMin, long outMax) {
    if (inMax == inMin) return outMin;
    return (x - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}
long constrain(long x, long lo, long hi) { return x < lo ? lo : (x > hi ? hi : x); }
void randomSeed(unsigned long seed) { srand((unsigned int)seed); }
long random(long howbig) { return howbig <= 0 ? 0 : rand() % howbig; }
long random(long howsmall, long howbig) {
    return howsmall >= howbig ? howsmall : howsmall + random(howbig - howsmall);
}

// --- String ----------------------------------------------------------------
// Arduino's String, backed by std::string. Covers what the lessons use.
class String {
public:
    std::string s;
    String() {}
    String(const char* v) : s(v ? v : "") {}
    String(const std::string& v) : s(v) {}
    String(int v)           { s = std::to_string(v); }
    String(long v)          { s = std::to_string(v); }
    String(unsigned long v) { s = std::to_string(v); }
    String(double v, int decimals = 2) {
        char buf[64]; snprintf(buf, sizeof(buf), "%.*f", decimals, v); s = buf;
    }
    String(char c)          { s = std::string(1, c); }

    const char* c_str() const { return s.c_str(); }
    unsigned int length() const { return (unsigned int)s.size(); }
    char charAt(unsigned int i) const { return i < s.size() ? s[i] : '\0'; }
    int toInt() const { return atoi(s.c_str()); }
    double toFloat() const { return atof(s.c_str()); }
    String substring(unsigned int from) const { return String(from < s.size() ? s.substr(from) : std::string()); }
    String substring(unsigned int from, unsigned int to) const {
        if (from >= s.size() || to <= from) return String();
        return String(s.substr(from, to - from));
    }
    int indexOf(const String& needle) const {
        size_t p = s.find(needle.s);
        return p == std::string::npos ? -1 : (int)p;
    }
    bool equals(const String& o) const { return s == o.s; }
    bool startsWith(const String& o) const { return s.rfind(o.s, 0) == 0; }
    void toUpperCase() { for (size_t i = 0; i < s.size(); ++i) s[i] = (char)toupper(s[i]); }
    void toLowerCase() { for (size_t i = 0; i < s.size(); ++i) s[i] = (char)tolower(s[i]); }
    void trim() {
        size_t a = s.find_first_not_of(" \t\r\n");
        size_t b = s.find_last_not_of(" \t\r\n");
        s = (a == std::string::npos) ? std::string() : s.substr(a, b - a + 1);
    }
    String operator+(const String& o) const { return String(s + o.s); }
    String& operator+=(const String& o) { s += o.s; return *this; }
    bool operator==(const String& o) const { return s == o.s; }
    bool operator!=(const String& o) const { return s != o.s; }
};
static inline String operator+(const char* a, const String& b) { return String(std::string(a) + b.s); }

// --- Serial ----------------------------------------------------------------
class __LhtcSerial {
    std::string buffer;
    void flushLine(bool newline) {
        if (newline) {
            __lhtc_emit_text("S", buffer.c_str());
            buffer.clear();
        }
    }
public:
    void begin(long baud) { __lhtc_emit("B", baud, 0); }
    void end() {}
    operator bool() const { return true; }
    int available() { return 0; }
    int read() { return -1; }
    void flush() { if (!buffer.empty()) { __lhtc_emit_text("S", buffer.c_str()); buffer.clear(); } }

    void print(const String& v) { buffer += v.s; }
    void print(const char* v)   { buffer += (v ? v : ""); }
    void print(char v)          { buffer += v; }
    void print(int v)           { buffer += std::to_string(v); }
    void print(long v)          { buffer += std::to_string(v); }
    void print(unsigned int v)  { buffer += std::to_string(v); }
    void print(unsigned long v) { buffer += std::to_string(v); }
    void print(double v, int decimals = 2) {
        char buf[64]; snprintf(buf, sizeof(buf), "%.*f", decimals, v); buffer += buf;
    }
    void print(int v, int base) {
        char buf[64];
        if (base == HEX)      snprintf(buf, sizeof(buf), "%X", v);
        else if (base == OCT) snprintf(buf, sizeof(buf), "%o", v);
        else if (base == BIN) {
            std::string bits; unsigned int u = (unsigned int)v;
            if (u == 0) bits = "0";
            while (u) { bits = char('0' + (u & 1)) + bits; u >>= 1; }
            snprintf(buf, sizeof(buf), "%s", bits.c_str());
        }
        else snprintf(buf, sizeof(buf), "%d", v);
        buffer += buf;
    }

    template <typename T> void println(const T& v) { print(v); flushLine(true); }
    void println(double v, int decimals) { print(v, decimals); flushLine(true); }
    void println(int v, int base)        { print(v, base); flushLine(true); }
    void println()                       { flushLine(true); }
    void write(char c) { buffer += c; }
};
static __LhtcSerial Serial;

// The sketch's own definitions follow.
void setup();
void loop();
// ---------------------------------------------------------------------------
`;

export const ARDUINO_EPILOGUE = String.raw`
// ---------------------------------------------------------------------------
int main() {
    __lhtc_load_input();
    for (int i = 0; i < __LHTC_PINS; ++i) {
        __lhtc_mode[i] = INPUT;
        __lhtc_digital[i] = LOW;
        __lhtc_analog_out[i] = 0;
        __lhtc_analog_in[i] = 0;
    }
    printf("\001I %lu 0 0\n", 0UL);
    setup();
    while (!__lhtc_stop) {
        unsigned long before = __lhtc_micros;
        loop();
        // A loop() with no delay would spin forever against the virtual clock,
        // so charge it the ~100 µs a real Uno would spend on one pass.
        if (__lhtc_micros == before) __lhtc_advance(100);
    }
    printf("\001E %lu 0 0\n", __lhtc_micros);
    Serial.flush();
    return 0;
}
`;

export interface ArduinoEvent {
  /** M=pinMode D=digitalWrite A=analogWrite R=analogRead N=tone B=begin S=serial I=init E=end */
  kind: "M" | "D" | "A" | "R" | "N" | "B" | "S" | "I" | "E";
  /** Virtual time in microseconds. */
  t: number;
  pin?: number;
  value?: number;
  text?: string;
}

/**
 * Splits a run's stdout into the board timeline and anything the sketch printed
 * with plain printf (which stays visible as ordinary output).
 */
export function parseArduinoOutput(stdout: string): {
  events: ArduinoEvent[];
  plain: string;
} {
  const events: ArduinoEvent[] = [];
  const plain: string[] = [];

  // Timeline records carry a SOH prefix so they can never be confused with
  // whatever the sketch prints itself.
  const MARKER = "\u0001";

  // Scan by marker rather than line by line. A record is not guaranteed to
  // start a line: a sketch that printf()s without a trailing newline leaves
  // the cursor mid-line and the next record lands right after it. Splitting on
  // newlines first would then fail to recognise that record and leak it into
  // the visible output — which is exactly what the trailing "end" record did
  // before this was fixed.
  const chunks = stdout.split(MARKER);

  // Anything before the first marker is ordinary program output.
  if (chunks[0]) plain.push(chunks[0]);

  for (const chunk of chunks.slice(1)) {
    const newline = chunk.indexOf("\n");
    const record = newline === -1 ? chunk : chunk.slice(0, newline);
    // Whatever follows the record's newline is ordinary output again.
    const trailing = newline === -1 ? "" : chunk.slice(newline + 1);

    const kind = record[0] as ArduinoEvent["kind"];
    const rest = record.slice(2);

    if (kind === "S") {
      const sp = rest.indexOf(" ");
      events.push({
        kind,
        t: Number(rest.slice(0, sp)),
        text: rest.slice(sp + 1),
      });
    } else if (kind) {
      const [t, a, b] = rest.split(" ").map(Number);
      events.push({ kind, t, pin: a, value: b });
    }

    if (trailing) plain.push(trailing);
  }

  return {
    events,
    plain: plain
      .join("")
      .split("\n")
      .filter((line) => line.length > 0)
      .join("\n"),
  };
}

/** Wraps a sketch so it can be handed to the C++ compiler unmodified. */
export function buildArduinoSource(
  sketch: string,
  opts: { budgetMs?: number } = {},
) {
  const budget = Math.round((opts.budgetMs ?? 6000) * 1000);
  return `#define LHTC_TIME_BUDGET_US ${budget}UL\n${ARDUINO_PRELUDE}\n#line 1 "sketch.ino"\n${sketch}\n${ARDUINO_EPILOGUE}`;
}
