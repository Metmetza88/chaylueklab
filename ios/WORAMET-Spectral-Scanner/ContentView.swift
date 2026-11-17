import SwiftUI
import CoreLocation
import CoreMotion
import AVFoundation
import Vision

final class SensorModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published var locationText = "รอ GPS"
    @Published var headingText = "รอเข็มทิศ"
    @Published var magneticText = "รอสนามแม่เหล็ก"
    @Published var soundText = "รอไมโครโฟน"
    @Published var cameraStatus = "ยังไม่เปิดกล้อง"
    @Published var objects = "ยังไม่วิเคราะห์ภาพ"
    private let location = CLLocationManager()
    private let motion = CMMotionManager()
    private var recorder: AVAudioRecorder?
    private var audioTimer: Timer?

    override init() {
        super.init()
        location.delegate = self
        location.desiredAccuracy = kCLLocationAccuracyBest
        location.headingFilter = 2
    }
    func startLocation() {
        location.requestWhenInUseAuthorization()
        location.startUpdatingLocation()
        if CLLocationManager.headingAvailable() { location.startUpdatingHeading() }
        if motion.isMagnetometerAvailable {
            motion.magnetometerUpdateInterval = 0.25
            motion.startMagnetometerUpdates(to: .main) { [weak self] data, error in
                guard let m = data?.magneticField else { return }
                let magnitude = sqrt(m.x*m.x + m.y*m.y + m.z*m.z)
                self?.magneticText = String(format: "%.1f µT (ค่าดิบ)", magnitude)
            }
        } else { magneticText = "Magnetometer ไม่พร้อมใช้งาน" }
    }
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let p = locations.last else { return }
        locationText = String(format: "%.4f°, %.4f°", p.coordinate.latitude, p.coordinate.longitude)
    }
    func locationManager(_ manager: CLLocationManager, didUpdateHeading h: CLHeading) {
        let angle = h.trueHeading >= 0 ? h.trueHeading : h.magneticHeading
        headingText = String(format: "%.0f°", angle)
    }
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        locationText = "GPS: " + error.localizedDescription
    }
    func startAudio() {
        AVAudioApplication.requestRecordPermission { [weak self] allowed in
            DispatchQueue.main.async {
                guard let self = self else { return }
                guard allowed else { self.soundText = "ไม่อนุญาตไมโครโฟน"; return }
                do {
                    let session = AVAudioSession.sharedInstance()
                    try session.setCategory(.record, mode: .measurement)
                    try session.setActive(true)
                    let url = FileManager.default.temporaryDirectory.appendingPathComponent("spectral-meter.caf")
                    let settings: [String: Any] = [AVFormatIDKey: Int(kAudioFormatAppleIMA4), AVSampleRateKey: 16000, AVNumberOfChannelsKey: 1]
                    self.recorder = try AVAudioRecorder(url: url, settings: settings)
                    self.recorder?.isMeteringEnabled = true
                    self.recorder?.record()
                    self.audioTimer?.invalidate()
                    self.audioTimer = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: true) { [weak self] _ in
                        self?.recorder?.updateMeters()
                        let value = self?.recorder?.averagePower(forChannel: 0) ?? -160
                        self?.soundText = String(format: "%.1f dBFS (ไม่ใช่ dB SPL)", value)
                    }
                } catch { self.soundText = "Audio: " + error.localizedDescription }
            }
        }
    }
    func stop() {
        location.stopUpdatingLocation()
        location.stopUpdatingHeading()
        motion.stopMagnetometerUpdates()
        audioTimer?.invalidate()
        recorder?.stop()
    }
}

struct ContentView: View {
    @StateObject private var sensor = SensorModel()
    var body: some View {
        TabView {
            NavigationStack {
                Form {
                    Section("ตำแหน่งและทิศทาง") {
                        LabeledContent("GPS", value: sensor.locationText)
                        LabeledContent("ทิศ", value: sensor.headingText)
                        Text("แผนที่ดาวจริงต้องเพิ่มฐานข้อมูลดาวและคำนวณเวลา/ตำแหน่ง")
                            .font(.footnote)
                    }
                    Button("เริ่มอ่าน GPS และเซนเซอร์") { sensor.startLocation() }
                }.navigationTitle("STAR")
            }.tabItem { Label("ดาว", systemImage: "star") }
            NavigationStack {
                Form {
                    CameraView(status: $sensor.cameraStatus)
                        .frame(height: 300).clipShape(RoundedRectangle(cornerRadius: 12))
                    Text(sensor.cameraStatus)
                    Text("ภาพจากกล้องจริง • ยังไม่มีโมเดลจำแนกวัตถุ")
                        .font(.footnote)
                }.navigationTitle("OBJECT")
            }.tabItem { Label("วัตถุ", systemImage: "camera") }
            NavigationStack {
                Form {
                    LabeledContent("สนามแม่เหล็ก", value: sensor.magneticText)
                    LabeledContent("เสียง", value: sensor.soundText)
                    Button("เริ่มอ่านเซนเซอร์") { sensor.startLocation(); sensor.startAudio() }
                    Button("หยุด") { sensor.stop() }
                    Text("ความผิดปกติของสนามแม่เหล็กหรือเสียงไม่ใช่หลักฐานว่ามีผี ค่าแม่เหล็กดิบอาจคลาดเคลื่อนและได้รับผลจากอุปกรณ์ใกล้เคียง")
                        .font(.footnote)
                }.navigationTitle("ANOMALY")
            }.tabItem { Label("ความผิดปกติ", systemImage: "waveform.path") }
        }.tint(.green)
    }
}

struct CameraView: UIViewRepresentable {
    @Binding var status: String
    func makeUIView(context: Context) -> CameraPreview {
        let view = CameraPreview()
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                status = granted ? "เปิดกล้องแล้ว" : "ไม่ได้รับอนุญาตกล้อง"
                if granted { view.start() }
            }
        }
        return view
    }
    func updateUIView(_ uiView: CameraPreview, context: Context) {}
}
final class CameraPreview: UIView {
    private let session = AVCaptureSession()
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    private var preview: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
    func start() {
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device) else { return }
        DispatchQueue.global(qos: .userInitiated).async {
            self.session.beginConfiguration()
            if self.session.canAddInput(input) { self.session.addInput(input) }
            self.session.commitConfiguration()
            DispatchQueue.main.async {
                self.preview.session = self.session
                self.preview.videoGravity = .resizeAspectFill
            }
            self.session.startRunning()
        }
    }
}
