// Mesure de la page des portails dans WebKit, le moteur de Safari et de tous les navigateurs d'iPhone (macOS seulement) : un WKWebView sans
// fenêtre visible, redimensionné à chaque largeur de la liste. Utilisé par scripts/calage-guide-portails.mjs, qui le compile (swiftc) puis le lance :
//   calage-guide-webkit <url> <fichier.js> <largeur,largeur,…>
// Le fichier .js est une expression qui rend un objet ; le programme écrit sur la sortie standard la liste de ces objets, une par largeur, en JSON.
import Cocoa
import WebKit

final class Chargement: NSObject, WKNavigationDelegate {
  var fin: (() -> Void)?
  func webView(_ w: WKWebView, didFinish n: WKNavigation!) { fin?(); fin = nil }
  func webView(_ w: WKWebView, didFail n: WKNavigation!, withError e: Error) { fin?(); fin = nil }
  func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) { fin?(); fin = nil }
}

@MainActor func pause(_ s: Double) async { try? await Task.sleep(nanoseconds: UInt64(s * 1e9)) }

@MainActor func mesurer(url: String, js: String, largeurs: [Int]) async -> Int32 {
  let h = 900, premiere = largeurs.first ?? 1440
  let fenetre = NSWindow(contentRect: NSRect(x: -6000, y: -3000, width: premiere, height: h), styleMask: [.borderless], backing: .buffered, defer: false)
  let config = WKWebViewConfiguration()
  // Pas de barre de défilement : les largeurs mesurées sont celles de la page, comme dans Chrome lancé avec --hide-scrollbars.
  config.userContentController.addUserScript(WKUserScript(source: "var s=document.createElement('style');s.textContent='::-webkit-scrollbar{display:none}';document.documentElement.appendChild(s);", injectionTime: .atDocumentStart, forMainFrameOnly: true))
  let vue = WKWebView(frame: NSRect(x: 0, y: 0, width: premiere, height: h), configuration: config)
  let chargement = Chargement(); vue.navigationDelegate = chargement
  fenetre.contentView = vue; fenetre.orderBack(nil)
  await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in
    chargement.fin = { c.resume() }
    vue.load(URLRequest(url: URL(string: url)!))
    Task { @MainActor in await pause(30); if let f = chargement.fin { chargement.fin = nil; f() } }
  }
  // La page est prête quand l'hydratation a posé les sept états du guide et que la police d'affichage est chargée.
  var pret = false
  for _ in 0..<120 where !pret {
    await pause(0.5)
    pret = (try? await vue.callAsyncJavaScript("return document.querySelectorAll('.pm-pile .pm-etat').length === 7 && document.fonts.status === 'loaded'", arguments: [:], in: nil, contentWorld: .page)) as? Bool ?? false
  }
  if !pret { FileHandle.standardError.write("la page n'a pas affiché les sept états du guide\n".data(using: .utf8)!); return 1 }
  var rendu: [Any] = []
  for w in largeurs {
    fenetre.setContentSize(NSSize(width: w, height: h)); vue.frame = NSRect(x: 0, y: 0, width: w, height: h)
    // Le redimensionnement est asynchrone : on mesure quand la page a bien cette largeur.
    var mesure: Any? = nil
    for _ in 0..<40 {
      await pause(0.06)
      mesure = try? await vue.callAsyncJavaScript("return " + js, arguments: [:], in: nil, contentWorld: .page)
      if let m = mesure as? [String: Any], let largeur = m["largeur"] as? Double, Int(largeur) == w { break }
    }
    rendu.append(mesure ?? NSNull())
  }
  let donnees = (try? JSONSerialization.data(withJSONObject: rendu)) ?? Data("[]".utf8)
  FileHandle.standardOutput.write(donnees)
  return 0
}

let args = CommandLine.arguments
guard args.count == 4, let js = try? String(contentsOfFile: args[2], encoding: .utf8) else { FileHandle.standardError.write("usage : calage-guide-webkit <url> <fichier.js> <largeur,largeur,…>\n".data(using: .utf8)!); exit(2) }
let largeurs = args[3].split(separator: ",").compactMap { Int($0) }
let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
Task { @MainActor in exit(await mesurer(url: args[1], js: js, largeurs: largeurs)) }
app.run()
