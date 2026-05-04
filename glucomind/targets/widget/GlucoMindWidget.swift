import WidgetKit
import SwiftUI

// MARK: — Shared Data

struct GlucoseData {
    let value: Double      // mmol/L
    let trend: String      // e.g. "stable", "rising", "falling"
    let timestamp: Double   // Unix ms
    let source: String
    
    var trendArrow: String {
        switch trend {
        case "rising_fast": return "↑↑"
        case "rising": return "↑"
        case "rising_slight": return "↗"
        case "stable": return "→"
        case "falling_slight": return "↘"
        case "falling": return "↓"
        case "falling_fast": return "↓↓"
        default: return "→"
        }
    }
    
    var minutesAgo: Int {
        Int((Date().timeIntervalSince1970 * 1000 - timestamp) / 60000)
    }
    
    var color: Color {
        if value < 4.0 { return .red }
        if value > 10.0 { return .orange }
        return Color(red: 0, green: 0.75, blue: 0.65) // primary green
    }
    
    static let placeholder = GlucoseData(value: 6.2, trend: "stable", timestamp: Date().timeIntervalSince1970 * 1000, source: "placeholder")
}

func loadGlucoseData() -> GlucoseData {
    let groupID = "group.com.glucomind.app.widget"
    guard let defaults = UserDefaults(suiteName: groupID) else {
        return GlucoseData.placeholder
    }
    
    // react-native-shared-group-preferences stores a JSON string under the key
    guard let jsonString = defaults.string(forKey: "glucoseData"),
          let jsonData = jsonString.data(using: .utf8),
          let dict = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] else {
        // Fallback: try individual keys (direct UserDefaults writes)
        let value = defaults.double(forKey: "glucose_value")
        if value == 0 { return GlucoseData.placeholder }
        let trend = defaults.string(forKey: "glucose_trend") ?? "stable"
        let timestamp = defaults.double(forKey: "glucose_timestamp")
        let source = defaults.string(forKey: "glucose_source") ?? "unknown"
        return GlucoseData(value: value, trend: trend, timestamp: timestamp, source: source)
    }
    
    let value = (dict["glucose_value"] as? NSNumber)?.doubleValue ?? 0
    if value == 0 { return GlucoseData.placeholder }
    
    let trend = dict["glucose_trend"] as? String ?? "stable"
    let timestamp = (dict["glucose_timestamp"] as? NSNumber)?.doubleValue ?? 0
    let source = dict["glucose_source"] as? String ?? "unknown"
    
    return GlucoseData(value: value, trend: trend, timestamp: timestamp, source: source)
}

// MARK: — Timeline

struct GlucoMindEntry: TimelineEntry {
    let date: Date
    let glucose: GlucoseData
}

struct GlucoMindProvider: TimelineProvider {
    func placeholder(in context: Context) -> GlucoMindEntry {
        GlucoMindEntry(date: Date(), glucose: .placeholder)
    }
    
    func getSnapshot(in context: Context, completion: @escaping (GlucoMindEntry) -> Void) {
        let entry = GlucoMindEntry(date: Date(), glucose: loadGlucoseData())
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<GlucoMindEntry>) -> Void) {
        let glucose = loadGlucoseData()
        let entry = GlucoMindEntry(date: Date(), glucose: glucose)
        
        // Refresh every 5 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: — Small Widget View

struct SmallWidgetView: View {
    let entry: GlucoMindEntry
    
    var body: some View {
        VStack(spacing: 4) {
            HStack(spacing: 2) {
                Text("GlucoMind")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.secondary)
                Spacer()
                if entry.glucose.minutesAgo < 60 {
                    Text("\(entry.glucose.minutesAgo)m ago")
                        .font(.system(size: 9))
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(String(format: "%.1f", entry.glucose.value))
                    .font(.system(size: 42, weight: .bold, design: .rounded))
                    .foregroundColor(entry.glucose.color)
                    .minimumScaleFactor(0.6)
                
                VStack(alignment: .leading, spacing: 0) {
                    Text(entry.glucose.trendArrow)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(entry.glucose.color)
                    Text("mmol/L")
                        .font(.system(size: 9))
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            // Range indicator
            HStack(spacing: 4) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(entry.glucose.color.opacity(0.3))
                    .frame(height: 4)
                    .overlay(
                        GeometryReader { geo in
                            let pct = min(1, max(0, (entry.glucose.value - 2) / 18))
                            RoundedRectangle(cornerRadius: 2)
                                .fill(entry.glucose.color)
                                .frame(width: 8)
                                .offset(x: pct * (geo.size.width - 8))
                        }
                    )
            }
            
            HStack {
                Text("2")
                    .font(.system(size: 8))
                    .foregroundColor(.secondary)
                Spacer()
                Text("10")
                    .font(.system(size: 8))
                    .foregroundColor(.secondary)
                Spacer()
                Text("20")
                    .font(.system(size: 8))
                    .foregroundColor(.secondary)
            }
        }
        .padding(12)
    }
}

// MARK: — Medium Widget View

struct MediumWidgetView: View {
    let entry: GlucoMindEntry
    
    var body: some View {
        HStack(spacing: 16) {
            // Left: glucose value
            VStack(alignment: .leading, spacing: 4) {
                Text("GlucoMind")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.secondary)
                
                Spacer()
                
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(String(format: "%.1f", entry.glucose.value))
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundColor(entry.glucose.color)
                    
                    Text(entry.glucose.trendArrow)
                        .font(.system(size: 26, weight: .bold))
                        .foregroundColor(entry.glucose.color)
                }
                
                Text("mmol/L")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
                
                Spacer()
            }
            
            // Right: status info
            VStack(alignment: .leading, spacing: 8) {
                Spacer()
                
                HStack(spacing: 4) {
                    Circle()
                        .fill(entry.glucose.color)
                        .frame(width: 8, height: 8)
                    Text(statusText)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.primary)
                }
                
                if entry.glucose.minutesAgo < 60 {
                    Text("Updated \(entry.glucose.minutesAgo)m ago")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                } else {
                    Text("No recent data")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }
                
                Text(trendDescription)
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
                
                Spacer()
            }
        }
        .padding(14)
    }
    
    var statusText: String {
        if entry.glucose.value < 4.0 { return "Low" }
        if entry.glucose.value > 13.0 { return "Very High" }
        if entry.glucose.value > 10.0 { return "High" }
        return "In Range"
    }
    
    var trendDescription: String {
        switch entry.glucose.trend {
        case "rising_fast": return "Rising quickly"
        case "rising": return "Rising"
        case "rising_slight": return "Rising slightly"
        case "stable": return "Steady"
        case "falling_slight": return "Falling slightly"
        case "falling": return "Falling"
        case "falling_fast": return "Falling quickly"
        default: return "Steady"
        }
    }
}

// MARK: — Widget Definition

@main
struct GlucoMindWidget: Widget {
    let kind: String = "GlucoMindWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: GlucoMindProvider()) { entry in
            if #available(iOS 17.0, *) {
                WidgetView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                WidgetView(entry: entry)
                    .padding()
                    .background()
            }
        }
        .configurationDisplayName("GlucoMind")
        .description("Live glucose reading from your CGM")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct WidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: GlucoMindEntry
    
    var body: some View {
        switch family {
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}
