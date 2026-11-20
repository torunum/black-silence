/* ASH_BELL_ARRIVAL_BEGIN */
// Adem hears the monastery from the crypt reached through the prologue's hatch.
(() => {
  const beginAt = 1.74;
  const duration = 6.2;
  const captions = [
    { at: .16, text: "The Ash Bell. I heard it even under the earth." },
    { at: 3.04, text: "Two seals on the way out. I wonder who they meant to keep in." },
  ];
  const skipKeys = new Set(["Space", "Enter", "NumpadEnter"]);
  const gameplayKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight",
    "KeyE", "KeyM", "KeyR", "KeyZ", "Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);
  let arrival = null;
  let interfaceElements = null;

  const medallionAtlas = /* BELL_MEDALLION_ATLAS_BEGIN */ "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hEkDMQIpZGrjUaEYAiniIOIgwiDCIMIgwiDiIMIgwiDiKAMxQ0FDQUNBQ0FDQSM54jDkaSnkx9uEoqNhoSjiMAVqZYqFkoWCAjlAEIEYQ0Flgoi7hoLCKOIoIzkjOSM5Q0FDQSM5IzkCMQIxAjEjMeIo4ijCIOIgwiDiIOIg4ijiIMIgoRhkckI5ohjFUYRBAyniKCRi41GiIAIp4iDiIOIg4iDiKMIg4iDiKOIoAjEjOUNBQ0EjQUNBQ0ECOcIoAjFlimbLp9PlqkJRwjAiOUV6RXoCOUAQoSjDYWerqMOou+RhgRjCICM5IzkjOUNBQ0FDQWNBAjECMQMxIzECKQIp4iDiIOIg4ijCIOIo4iDCIKEYRHICMWEQpElkQQMpAikDWqNJoiADMeIg4iDiKOIg4ijiKOIo4igDMQMxAjEjOUM5IzkjOQI5AjHCKIEYgSBiUUSKxaJlioNZIkGGemV6wTAiQWWCJ7Onu+aa5GmhKIEYwiACMSM5QzkjOSM5QzlDOSMxAzECMSMxAyniKOIo4ijiIOIg4iDCIMIgwhihIGRyAjFhEMVRhEEDKQIp41FiQcIgIzECKeIo4ijiIOIgAikCKeIoAjECMSM5IzkjOSI5IjkCOeIwoSChIENBIkHBMGJR5HHkacRZ5pLGkoNZhYLmmiR6w2HiOIEgYRChGMIgAjEjMSM5IzkjOQM5IzECMQIp4igDKeIowijiKAIp4ijiKOIgwiDCIMIgwSBkcgIxgRjFUYRBAykiMQNSYjnCIAMxAikCKeIo4iDiIOIoAikCMQIxAjEjOQIxAjECMQIxAjHiMKEgAjmlkiR64jDBKMIwZEnEWeaaB6NjSWNRQ0GhKMEo4jDCKGEYoRjCIOIoAjEjMSMxIzEjMSMxAjECMeIo4ijCIOIowiDiKOIoAiniKOIo4iDCIMEgRHLiMIIYhElEOQMpIjEDWmI5wiADMQMpAiniKOIg4ijiKAIpAjECMQIxAjECMQIxAjECMeIo4iiiIOIwZIpEiiJJwSihIMIoAjkGm0ejoSBhGKEgQ0Elcueao1FhEKEYwiDiKOIoAzECMQIxAzEDMQMxIzECKeIowiDiKMIo4ijiKAIp4ijiKOIowiDBIERy4iiiGKVJZEEDKSIxI2JCOcIgIzECKeIgwiDCIMIg4ijiKOIoIjECMeIo4igCKQIp4ijiKOIooiBhGOE4w2nEaYNRIjniMOEw5poHo4Ag4jCjWcaSZ7NIq2NJYBChGMIg4ijiKOIoAjECMQIpAzEDMQMx4ijiKOIg4iDCIOIgwiDiIMIgwiDiIMIg4ShEauIoohjFUYRBAylDOUNiQjHDIAMp4iADISQpJCkDIcIg4iDiKAIpAiniKOIoAiniKOIo4ijiKMIgYRAgCMIoBHJkegRyBGqDUaWKxpIiSSRypZLGmsaao1mBIGEQoiDCIOIo4ijiKAIpAzECKQMpAykCKeIo4iDCIKIgwiDCIKIYwhiiGMIg4iChGOEoRGriKKIghElkOQMpYzlEaiIxohjjKAMhpTkHQkdK5jnjIMIg4iDiIOIoAiniKOIo4ijiKOIo4ijCIKEYQAhhEOIwg1EEakVyxFmFgoWKo2GFgkR6g1lCQWEYIAhhEMIgwiDiKOIoAikCKQIpAykDKeIoAiniIKIYohgkKWQxZDEDKcIYohjCGOIgoRjhKERyAinCIKRJhEEDKWM5ZGoCKYIYRDHmQQdKxjkHQidKRDGiGMIgwiDiKAIp4igCKeIoAiniKOIowiCBGIEYgRhAEKEYwSjCKOIohYIleuIwQ0ECMWEYQBAgCEEQgRjCIMIg4ijiKAMxAikCKQIpAykCKQIpwiCiGIUxSEqlOaU5pTlkKaIYohjCIKIY4ShkcgIxwiDlUaRJAyljQWRq4iCiGMZBiFqFMeMg4yCFMWUxwhiiGMIg4ijiKOIoAzEDMQMx4ijiKMIgoSChGKEYgRiBGEAIAABgEIWCpFkgCEAQIAggCEAIYRCBGKEgwiDCIOIoAikDMQMxAzECKQMpAiniKKIg4yCJUuZB4yADIWUxpjkkKaIYohiiGOEoZHIiMeIopElkQQMpg0FkcuIgohimOeZBwiDCGKIYAyFEKcIYohjiIOIoAjEDMQMxAzECKeIo4ijiKMIooSDBIKEgoRhhECAIYBBlgiJBAAAgACAAQBCBEIEYoiDCIMIg4iDiKOIoAikDMQMxAikDKQIp4yiiGEQpB0LCGKIYwhiiGGQxpTnCGKEYohjhKGRyIjHiKIRJZEEDKaNJZHLiIKIY4yADKeMg4yDCIAQhRCnCGKIY4iADKSMxAzEDKQIp4ijiKAIp4ijiKMIgwiChGKEYYRAAAGAQZXrhMAAAIABACGEQgRiBGKIYoiDCIMIg4iDCIOIg4igDKQMxAykCKeIooiAkKSQpohjCGOIgohgDIWQxwhihEKEY4ShkciIxwiDFUaRJAymjSWRy4iCiGIIQwhgkKUQpAykDIeMYohiBGOIgAikDMQIp4ijiKAIpAikDMeMo4ijCIKEgoRiBGEAIAABACORZgSAAAAAAIACBEIEYgRihGMIgwiDCIMIgwiDCIAIpIykDMQIpAiniKKIgwhgDIeMgwxjjIOMgAyHCIIEQoRChGOEoZXIiOeIgpElkQQIpo1FkasIgohiBEKIQAyFEKQMpwhhhEIEQohjiKOIoAikCKQMpAikDMQMxAzEDKeIowiCiIIEYYBBgEIEYoiCDScEwgSBhECAIQAiBGIEYoRjCIMIgwiDiKMIgAikDMSMxAykjKQIpAinCIKIYwhgDISQpJCkDIeMggRBhEKEYoRjhKGVyIjHiKIRJZDniKMNRRGLBIKIYgRhhEIIQwhiBEGEQYQiBEKIY4ijiKAIpIzEjMQMxIzEDKQMpAiniKMIgohhhEMEg5GFmeiVqBGrDYQRqBGpCSUAQYRCBGKEYwiDCIOIoAiniKAMxIzEjMSMxIzECKQIpwiCBEIEQwhgDIQMhwhiBEGEQgRChGMEY4ShkciIx4iDFUYRBAinDUQRawSDiIKIYgRBhEGEQQQhhCIEQwhjiIOIoAikDKQMpAzEDKQMxAykDKeIo4ijCIIEQwSjHikizpopFcgVi5FklaoWCBqODWUAIgRjCIMIg4iDiKAMpAzEjMSMxIzEjMQMxAikCKeIowhiBEIEQgRCBEGEQYRCBEMEYwiDCIOEoZHIiMeIgxVGEQQIpo1HjUcEYwiDCIMIYohiBGIEQgRCiGMIgwiDiIOIoAyniKOIo4igCKQIpAinCIMIgoRhhEARq6sPlaQMxIzFDOSMxIzEjMWV65qKBIIEQwiDCIOIo4igDMQMxIzEjMSMxIzEDMQMpAyniKOIgohihGGEQYRBhEIEQoRjCIMIgwiDBKGRyAjHCIIRJQzniKMNRw0mhGMIgwiDCIMIgwiCiGMIYwhjCIMIg4iDiKOIoAikCKeIg4ijiKOIowiCiIGEQoSDHkoZ64igjMQMpIykDKUQxAykDMYaSY1FACMIg4iACKeIoAykDMSMxIzEjMSMxIzEDKQMp4ijiIMIgwhihGKIYoRjCGMIYwiDCIMIgwSBlcgIpwiCkSUMx4ijkWYNJoRjCIMIgwhjCIMIgwiDCIMIYwiDCIOIg4igDKQMpAyniIOIgwiDCIMIgohhhEOIwZnojOQMpIzEjMSMpIylDMSMpAykFaiVyIAiiIOIg4ijiKAMxAzEjMSMxIzEDMSMxAykDKQIp4iDCIMIgwiDCIMIgwiDCIKIgwiDCIMEgZWoCKaIY5VlkOSMxBGJiQYEQwiDCIMIYwiDCIMIgwiDiIOIg4iDiIOIoAykDMQMpAikCKcIgwiCiIKIYYRDiMOVhAikjKSMxIzFDMSMpIzEjMQMpxFlmgiAIgRjCIOIo4igjMSMxIzEjMQMxAikDKQIpAyniKMIgwiDiIMIgwiDCIMIgwiDCIMIgohjBIGVq4iiiGIRJAzEiMSRiIjmBEKIYwiDCGMIg4iDCIMIg4iDiIMIg4igCKQIp4ygCKQMpAyniKMIgoRiBGGEQAjmkUQIpIzFDMSMxQzEjMSMxRDEDKcRZhoIgCGEQoRjCIOIoIzEDMSMxAzEDMQIpAikCKQMp4ijCIOIg4iDiIOIgwiDCIMIgwiDCIKIYwSBEYuIgghBkQeMoAjEDWgEpgRDCIMIgwiDiIMIg4iDiIOIg4iDiIAMpAykCKeIg4ijiKAMp4yjiIKEYgRhhECM5g0kCKSMxQzFEMUQxQzFEMUQxIzHEUaaKQBBBEKEY4ijiKAMxAzEDMSMxIzEDMQMp4ijiKOIo4ijiIOIg4iDiIOIg4iDCIKIYwiCiGKEYRGLiIIEQhUkDKSIxA1rhIIEQwiDCIMIg4iDCIMIg4iDCIOIoAikCKQMp4ijCIMIg4igDKeIo4iihGGEQYRBDQYRJAykjMUMxQzFEMUQxRDFEMSMpZEGGimEQQRCBGOIg4igDKQMxIzEjMSMxIzEDKeIo4igCKQMp4iDiIMIg4iDiIMIgwiCiGKIYgRihGCRi4iCBGEQ54yBCMSNi4SCBEMIgwiDiIOIg4yjiIOIg4iACKQMpAyniKOIo4iDiIOIg4ijiKOIgoRhhEGEYpFGESeIoIzFDMUMxZDlEMUMxIzEjKWNBppKBIEEQgRjCIOIoAikDKSMxAzEDKeIo4ijiIAIp4ijiKOIg4ijiIOIgwiDCIMIYohiBGIEQgRAEWgIpghjDKGEQAjFEakI54SgCKQIpAjHiKOMo4iDiKOIg4ijiKOIo4iDiKOIo4iDCIMIg4iDCIKEYQAiBGAVqY0niKCMxQzFDMWQ5ZDljMUMxIzFDOeaaAjkgCIEYoSDCIAIpAikDKeIo4ijiIOIo4ijiKOIoAiniIAIp4iDCIMIgwhiiGKIYgRhhEEAIw0nCIGEQoiBBEOIoJGKjUYJJg0mCSaNJYkHiKOIoAyniKOIg4iDiIOIg4ijiKOIgwiDCIKIgwiCBECAIAjmGgiI5AjFDMWM5ZDlkOWQ5hDlkOUMxY0HmmgVyIAhhEKEYwiDiIOIg4iDCIOIg4iACKeIo4igCKQIp4iDiIMIgwiDCGMIYohiiGKEYoRihGMNJoRhBCKIgghiBGOIowSjhKAIpAjGCQaNRIjHiKAMp4iDiIOIo4igCKQMp4iDiIMIgwiChGKEYQAiBGEZ6hoLCMCMxZDmEQaRBpUGEQYRBZDlEOWM5JHIHo6EoQAihGKEYwRjCIMIgwiDiIOIg4iDiIAMp4ijiIOIgwiDCIOIgwhihGOIg4iDBIAIxQjmjSYEYYRCiIKIggRhBEEAIQAhBCCEIgRBiQWJJAiniKOIo4ijiKAMpIzEDKQIp4iDCIMIgohhhEIEY5WHnmuRhAzFDOYRBpUkmWiVaxUmkSYRBhEFkQWNJpZIkimAYYRCBGMEYohjCIMIg4iDiIOIg4iDiIOIg4iDCIMIgwhjCGKIYwSACKaEYYRihIMEgoSBhEIEYwijCKMIgoSCBGIEYgRhhEEEIwSCCSeIg4igCKQIp4igDKQMxAykDKQMhwhjCGIEQYBDEWQejBHJjSSNBpEmkUQVix4KmegVipVGkSeRRpFFjScNpBcPjeWEYgRChGKEYwiDCIMIg4iDiIMIgwiDiIOIgwiDCIKIYghChGIJBwSgAAAAAAAAgCEAQgRjCIOMo4ijiKMIgoiChGIEYYRhBEKEgYkHCIOIoAikCKQIp4yjjKAMpAyniIMIgwhhgEAIx6JpmisRhBWLlYYZ6ZnrGkgejJ5tlekVyRWplekVyRXLjacWyh8tiUWEQoRiiGMIgwiDiIOIgwiCiGMIg4iDiIOIg4iDiIKIYwSCiSWAQAAAgCEEIQRCBGKIgwiDCKMIooiCiIKIgoiCBGIEYYRCBGAIxoRjiIAIp4ijiKOMo4igDKeIo4iDiIMIYgRDiKIRRQ0mEUaRRhFHlYeVhJXIEcgVqpFkEagRqJWrkYcRZY1HDaaWSY1FAEKEYwiDCIMIg4ijiIMIgwiDCIMIgwiDiIOIoQzniIIEYgBggCCAIQQhhEIEYohjCIMIgwijCIMIgoiCiIKIgoiCBGGEQgRjhMMEg4igiMQIp4igDKQIp4ijiIOIg4iDiIMIgYRAgCCAIIAggCCAIIAhACIEY4jjBMKEowiihIKEgYBhgEEAQYBBgEGAQQRCiGMIg4ijiKAIp4ijiKOIg4iDCIMIgohjBIAIxoRgAAAAAIAhBCGEQgRiCGKIgwiDjKOMo4yjjKOMo4yjCKKIggiBhEGEQ4jBCQSI5g0FiQQIxAiniIOIo4iACKeIgAiniKKEYYRBACCAAIAAAAAAAAACBGORpYlHhMIEYAAAgACAAIAggCEAIQAhhCIEQwiDiKAMp4ijiKOIoAiniIOIowiDCIIEYoRgCMUAQAAAgCEEIYRBhEIIYoiDCIMMo4yjjKOMowyjDKOMowijCKKIgghhhEGEQoRihGAIxg0FiOQIx4iADKeIoAiniKAIp4ijiKMIYgRBAEEAIIAgAAAAAoSBEeoJZIkGhIAAAIAAgACAIQAhhEIEQoRiiGOIoAikDKQMpAyniKOIo4iACKcIgwiChGOEogklgEAAAQQhhEIIYghiiIMIg4yjjKAMp4yjDKMMowyjCKMIgwiCiIKIggRBBCCAAAAAAAKEYIjkiOeIgAyniKOIoAikCKQIpAinCIKIYgRhhEEAIIAgAAGEQY0kiQQIxYRAAAAAAIABACIEQoRihGMIYwiDiKAIpAikDKQMp4ijiKMIg4igCMQIpAjGCSeJZYBAgAGEQYRiCGKIgwyDDKOMo4yjjKOMw4yjjKOMo4yjCKMIgwiCiIKIYohhhEGEIIAggAIEYYkECKeIg4igCKQIpIykDKQIp4iDCIMIYoRihGIEQQAhAEIEYoSCAGCAIAAAgAEAIYRChGKEYohjCIOIg4iDiKAIpAikCKeIo4iACKUM5Q0FCOUI5YkFiQYEYYRCiGKIgwijjKAMxAzEkMSQ5RDkDMQMxAzHjMOMo4yjjKMMowijCIMIgohiBGEEIIAiBGIJJASmiGOIoAikCKQMpAiniIMIgwiDCIMIgohihGIEQYRBACCAIIAgAACAAYQhhEIEQgRihGMIYwiDCIMIgwiDiIMIg4iDiIOIgg0FjQYEggRhgEEAQYBiBGMIgAykjMWRBhUmlUcVRBloGYiZiREFEOUQ5RDlEOUQ5IzEjMQMxAynjKMIgwiCBEEEIgRijSQIpghjiKOIo4ijiIOIg4iDiIOIg4iDiIMIgwiDCGIEYYRBACCAIIAhhEIEQoRihGKEYoRjCGMIgoiDCIKIYwiDCIMIgwiDCIONRAjEAACAIIAhhEIEY4igDMUQ5hEnFUeVZBmImYkZqJmomasVRpFGlSaRJpEmkSYRJhEFkQYRBZEFEOSMx4iiBGIEYo0nhKGEQwiDCIOIg4iDCIOIgwiDiIMIgwiDCIMIgohjCGKEYgRBACGEQoRChGKEYoRihGKIYoRihGKIYohiBGKEYoRihGIEYgRijSQIpIABhEIEY4igDMUM5RDmESaVR5WEmaiZqJmpGaiZqRmomYiZiJmImYiZiJmImYgZaBloFWuVRpUmEQSMxwiDCIINJ4SiBGCIxAjECKeIg4iDiIOIg4iDiIOIgwiDCIMEgwiChGKEYgRChGKEYoRihGKEYoRihGKEYoRiBGIEQgRChEIEQgRiBGIEQo0kCKSAIoRjiKCMxY0GkSaVRxVHlYUZqp3qneqd6yIKoesiCBVoFWgVa5VkFWuVZ5VnFUcVRpUmESWRBQzkDMcIgoiBiQWJBQkHDUaJJYkFCOSIxIjFDOYNJg0liQSI5QkFCOUI5ATEBMQExIjECKQIp4SDiIMEgwSDCIAIp4SjiKMEg4iDBIOEgwSDBGMNRwSAgCIIYAzFjOWRBpEnFUeVZxVkFYkZqRmpGcmZyRnJncuVZ5VnlWeVZ5VnlWcVRxVGlUYRJhElkQUQ5AzHiKMIgIjFCOSI5QjkiMQIxAinhKAIxQjmjSaJJYkFCQUJBIjkiOSE5YkGCSYJJQkFCOSI5IjnhKKEYwSBCOUJBQjkhMSI5ATEiMSI5QjnjUcEgYRDCKCMxhEGkSeVRxVHFUaVRxVkFYiZqJmpGaiZqRmomYiZiJmImYgZiBmIGYgZaBVrlWeVZxVGlSWRBIzniKMIgYRBBCEAIQAhACEAIQAhACEAIQAhACEAIQAhACCAIQAhACGAQYBBgEEAQQBBAEEAQIAgAACAAQAhAEEAQQBBAEEAQYBBgGKEgwSCBGKIYAzFEOYRJxVHlWcVR5lnlWQZiZ2qHeod6p3qHcod65VHlWeVZ5VnlWeVZ5VnlUeVZ5VHFUcVRpEmESWRBAzHiIIEYYRBhEIEQYRBhEGEQYRBhEGEQYRBhEGEQYRBBEGEQYRBhEEAIQQhACEAIQAggCCAIIAggCCAIIAAgACAAIAAgACAIIAhBCGEQohjjKEQ5hEHFUcVR5lnmUeVRxVEGYkZqZ3JmcmZyRmpmcg==" /* BELL_MEDALLION_ATLAS_END */;
  function plateTexture() {
    const bytes = atob(medallionAtlas);
    const texture = Z(e0(context => {
      const pixels = context.createImageData(71, 64);
      for (let i = 0; i < 71 * 64; i++) {
        const rgb = bytes.charCodeAt(i * 2) | bytes.charCodeAt(i * 2 + 1) << 8;
        pixels.data[i * 4] = (rgb >> 11) * 255 / 31;
        pixels.data[i * 4 + 1] = (rgb >> 5 & 63) * 255 / 63;
        pixels.data[i * 4 + 2] = (rgb & 31) * 255 / 31;
        pixels.data[i * 4 + 3] = 255;
      }
      context.putImageData(pixels, 0, 0);
    }, 71, 64));
    texture.name = "ashBellMedallionBronze";
    texture.colorSpace = ha;
    texture.minFilter = Yh;
    texture.generateMipmaps = true;
    return texture;
  }

  function hangMedallion(scene, door) {
    const edge = [[19,2],[56,2],[56,9],[61,10],[62,14],[69,14],[69,47],[65,49],
      [64,56],[58,58],[58,62],[16,62],[16,57],[11,56],[10,50],[3,48],
      [3,15],[10,14],[11,11],[16,9],[17,3]].reverse();
    const points = [], uv = [], shade = [];
    function vertex([u, v], depth, scale, brightness) {
      points.push((u / 71 - .5) * .624 * scale, (.5 - v / 64) * .618 * scale, depth);
      uv.push(u / 71, 1 - v / 64);
      shade.push(brightness, brightness, brightness);
    }
    for (let i = 0; i < edge.length; i++) {
      const a = edge[i], b = edge[(i + 1) % edge.length];
      vertex([35.5, 32], .045, .97, 1);
      vertex(a, .045, .97, 1);
      vertex(b, .045, .97, 1);
      vertex(a, .045, .97, .77);
      vertex(a, 0, 1, .56);
      vertex(b, 0, 1, .56);
      vertex(a, .045, .97, .77);
      vertex(b, 0, 1, .56);
      vertex(b, .045, .97, .77);
    }
    const geometry = Z(new h0());
    geometry.setAttribute("position", new y0(new Float32Array(points), 3));
    geometry.setAttribute("uv", new y0(new Float32Array(uv), 2));
    geometry.setAttribute("color", new y0(new Float32Array(shade), 3));
    geometry.computeVertexNormals();
    const material = Z(new $e({ map: plateTexture(), vertexColors: true, toneMapped: false, fog: false, side: hi }));
    const mesh = new pt(geometry, material);
    mesh.name = "ashBellArrivalMedallion";
    mesh.position.set(door.mesh.position.x - 1.77, door.mesh.position.y + 1.49, door.mesh.position.z + 1.23);
    scene.add(mesh);
  }

  const decorate = FJ;
  FJ = function (scene, map) {
    decorate.apply(this, arguments);
    const door = v.doors["83,73"];
    if (T.level === hR(0) && door && v.grid[73]?.[83] === "+") hangMedallion(scene, door);
  };

  function makeInterface() {
    const overlay = document.createElement("div");
    overlay.id = "ashBellArrival";
    overlay.hidden = true;

    const subtitle = document.createElement("p");
    subtitle.className = "ash-bell-subtitle";
    subtitle.setAttribute("role", "status");
    subtitle.setAttribute("aria-live", "polite");
    subtitle.setAttribute("aria-atomic", "true");
    const speaker = document.createElement("b");
    speaker.textContent = "ADEM";
    speaker.hidden = true;
    const line = document.createElement("span");
    subtitle.append(speaker, line);

    const skip = document.createElement("button");
    skip.type = "button";
    skip.textContent = "SKIP · SPACE / CLICK";
    skip.setAttribute("aria-label", "Skip arrival cinematic");
    skip.addEventListener("click", skipArrival);
    overlay.append(subtitle, skip);
    document.body.append(overlay);

    const style = document.createElement("style");
    style.textContent = `
      #ashBellArrival { position: fixed; inset: 0; z-index: 17; pointer-events: none;
        color: #ead9ad; font-family: 'Courier New', monospace; }
      #ashBellArrival[hidden] { display: none; }
      #ashBellArrival::before, #ashBellArrival::after { content: ''; position: absolute;
        inset-inline: 0; height: clamp(15px, 5.5vh, 48px); background: #080705; }
      #ashBellArrival::before { top: 0; }
      #ashBellArrival::after { bottom: 0; }
      #ashBellArrival .ash-bell-subtitle { position: absolute; bottom: clamp(42px, 13.5vh, 100px);
        inset-inline: 0; margin: auto; width: min(660px, 91vw); text-align: center;
        color: #f2e3c3; text-wrap: balance; line-height: 1.48; letter-spacing: .03em;
        font: italic clamp(14px, 1.4vw, 19px)/1.48 'Courier New', monospace;
        text-shadow: 0 2px 2px #000, 0 0 8px #000, 1px 0 4px #000; }
      #ashBellArrival .ash-bell-subtitle b { display: block; margin-bottom: .2em;
        color: #dfb67f; font: bold clamp(10px, .9vw, 12px)/1.4 'Courier New', monospace;
        letter-spacing: .25em; }
      #ashBellArrival .ash-bell-subtitle b[hidden] { display: none; }
      #ashBellArrival button { z-index: 1; pointer-events: auto; position: absolute;
        inset-inline-end: max(12px, env(safe-area-inset-right));
        bottom: max(2px, calc(2.75vh - 13px), env(safe-area-inset-bottom));
        min-height: 25px; border: 0; border-radius: 2px; padding: 5px 8px;
        background: #100d0a; color: #d7c398; cursor: pointer;
        font: 11px/1 'Courier New', monospace; letter-spacing: .08em; }
      #ashBellArrival button:hover, #ashBellArrival button:focus-visible { background: #251d14; color: #fff0ca; }
      #ashBellArrival button:focus-visible { outline: 2px solid #d6b882; outline-offset: 1px; }
      body.ash-bell-arrival-visible :is(#minimap, #subt, #msg) { visibility: hidden; }
    `;
    document.head.append(style);
    return { overlay, speaker, line, skip };
  }

  function showInterface(visible) {
    if (!interfaceElements) return;
    if (interfaceElements.overlay.hidden === !visible) return;
    interfaceElements.overlay.hidden = !visible;
    document.body.classList.toggle("ash-bell-arrival-visible", visible);
  }

  function clearArrival() {
    if (!arrival) return;
    arrival = null;
    showInterface(false);
    if (interfaceElements) {
      interfaceElements.speaker.hidden = true;
      interfaceElements.line.textContent = "";
      if (document.activeElement === interfaceElements.skip) interfaceElements.skip.blur();
    }
  }

  function excludeWatchedTime(milliseconds, now) {
    if (milliseconds <= 0) return;
    T.levelT0 = Math.min(now, T.levelT0 + milliseconds);
    T.t0 = Math.min(now, T.t0 + milliseconds);
  }

  function finishArrival() {
    const shot = arrival;
    if (!shot) return;
    clearArrival();
    for (const key of Object.keys(li)) li[key] = false;
    Ct.yaw = shot.exitYaw;
    Ct.pitch = 0;
    Fd();
  }

  function paused() {
    return Wk() || document.hidden || Qm();
  }

  function skipArrival() {
    const shot = arrival;
    if (!shot?.started || paused()) return;
    if (!shot.wasPaused && shot.elapsed >= pc.arrive - shot.startFrame) {
      const now = performance.now();
      excludeWatchedTime(now - shot.lastWallFrame, now);
    }
    finishArrival();
  }

  function frame(shot) {
    const now = performance.now();
    const dt = Math.max(0, oe.t - shot.lastFrame);
    const wallStep = Math.max(0, now - shot.lastWallFrame);
    shot.lastWallFrame = now;
    shot.lastFrame = oe.t;
    if (paused()) {
      shot.wasPaused = true;
      showInterface(false);
      return;
    }
    showInterface(true);
    // The native 2.3-second arrival already counts toward the chapter clock.
    // Only the added watched segment is untimed. The engine clamps motion dt
    // under load, so account for the same fraction of the actual wall step.
    const remainingNative = pc.arrive - shot.startFrame;
    const elapsed = Math.min(duration, shot.elapsed + dt);
    const added = Math.max(0, elapsed - remainingNative) - Math.max(0, shot.elapsed - remainingNative);
    if (!shot.wasPaused && dt > 0) excludeWatchedTime(wallStep * Math.min(1, added / dt), now);
    shot.wasPaused = false;
    shot.elapsed = elapsed;
    if (shot.elapsed >= duration) {
      finishArrival();
      return;
    }

    const { source, destination, exitYaw } = shot;
    if (shot.reducedMotion) {
      Vr(C.px, C.pyy, C.pz, exitYaw, 0);
    } else {
      const lean = Ge(0, 2.05, elapsed), settle = Ge(4.8, duration, elapsed);
      const x = kn(kn(source.x, destination.x, lean), C.px, settle);
      const y = kn(kn(source.y, destination.y, lean), C.pyy, settle);
      const z = kn(kn(source.z, destination.z, lean), C.pz, settle);
      const yaw = source.yaw + lr(source.yaw, destination.yaw) * lean;
      const pitch = kn(kn(source.pitch, destination.pitch, lean), 0, settle);
      Vr(x, y, z, yaw + lr(yaw, exitYaw) * settle, pitch);
    }

    if (!shot.rang && elapsed >= .08) {
      shot.rang = true;
      Nt(167, ie(167, 142) + 2.2, 142, P4);
    }
    const caption = captions[shot.nextCaption];
    if (caption && elapsed >= caption.at) {
      interfaceElements.speaker.hidden = false;
      interfaceElements.line.textContent = `“${caption.text}”`;
      shot.nextCaption++;
    }
  }

  const advance = uk;
  uk = function () {
    const fromPrologue = T.level === 0 && oe.phase === "card";
    advance();
    if (!fromPrologue || T.level !== hR(0) || oe.phase !== "arrive" || z0.entrance?.rig.style !== "hatch") return;
    const door = v.doors["83,73"];
    if (!door || Math.hypot(C.px - 167, C.pz - 153) > .15 || fu(167.72, 152.32)) return;
    arrival = { scene: J.scene, level: T.level, started: false,
      exitYaw: dA(door.mesh.position.x - C.px, door.mesh.position.z - C.pz) };
  };

  const nativeArrive = o_;
  o_ = function () {
    if (!arrival || oe.t < beginAt) return nativeArrive();
    if (!arrival.started) {
      if (oe.t >= pc.arrive) {
        clearArrival();
        return nativeArrive();
      }
      nativeArrive();
      interfaceElements ??= makeInterface();
      const camera = J.camera;
      arrival.source = { x: camera.position.x, y: camera.position.y, z: camera.position.z,
        yaw: camera.rotation.y, pitch: camera.rotation.x };
      arrival.destination = { x: 167.72, y: C.pyy + .03, z: 152.32,
        yaw: dA(166.6 - 167.72, 144.8 - 152.32),
        pitch: Math.atan2(1.88 - (C.pyy + .03), Math.hypot(166.6 - 167.72, 144.8 - 152.32)) };
      arrival.lastFrame = oe.t;
      arrival.startFrame = oe.t;
      arrival.lastWallFrame = performance.now();
      arrival.wasPaused = false;
      arrival.elapsed = 0;
      arrival.nextCaption = 0;
      arrival.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
      arrival.started = true;
    }
    frame(arrival);
  };

  const update = i_;
  i_ = function (dt) {
    if (arrival && (arrival.scene !== J.scene || T.dead || oe.phase !== "arrive")) clearArrival();
    return update(dt);
  };

  const nativeLine = w0;
  w0 = function (key, ...args) {
    if (arrival?.scene === J.scene && arrival?.level === T.level && key === k5(T.level)) return;
    return nativeLine(key, ...args);
  };

  function resetWallStep() {
    if (arrival?.started) arrival.lastWallFrame = performance.now();
  }
  document.addEventListener("visibilitychange", resetWallStep);
  document.addEventListener("pointerlockchange", resetWallStep);

  addEventListener("keydown", event => {
    if (!arrival?.started || paused()) return;
    if (skipKeys.has(event.code)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) skipArrival();
    } else if (gameplayKeys.has(event.code) || /^Digit[0-9]$/.test(event.code)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.code === "Tab") interfaceElements.skip.focus({ preventScroll: true });
    }
  }, true);

  addEventListener("mousedown", event => {
    if (!arrival?.started || paused()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.button === 0) skipArrival();
  }, true);

  addEventListener("wheel", event => {
    if (!arrival?.started || paused()) return;
    event.stopImmediatePropagation();
  }, { capture: true, passive: true });
})();
/* ASH_BELL_ARRIVAL_END */
