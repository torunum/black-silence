/* PROLOGUE_CINDER_VIADUCT_BEGIN */
(() => {
  // The ash sluice drains the east half of the second nave's trench. Leave
  // the central causeway and the perimeter scramble intact as other routes.
  const lowerFlight = [.15, .45, .75, 1.05, 1.05];
  const upperFlight = [1.40, 1.75, 2.10];
  // The far wall is a bank of closed furnace dampers. Preserve its recessed
  // lancet stonework while letting the open wheel lead the foreground.
  const shrine=di.hellLancetShrine;
  di.cinderSluiceDampers={
    ...shrine,
    build(box,...args) {
      shrine.build((tile,...rest)=>box(tile==="hellGlass"?"wrought":tile,...rest),...args);
      for(const [x,height] of [[-1.6,2.35],[0,3.25],[1.6,2.35]]) {
        box("dark",.67,height-.27,.035,E(x,1.18+(height-.27)/2,-.085));
        for(let row=0;row<4;row++) {
          const y=1.31+row*(height-.45)/4;
          box("wrought",.64,.105,.11,E(x,y,-.14,-.26));
          box("hellBronze",.61,.029,.05,E(x,y+.049,-.192));
          if(row===2 || (row===1 && x===0))
            box("hellGlass",x===0?.29:.14,.039,.025,E(x,y+.079,-.116));
        }
      }
    }
  };
  const build = gV[0].build;
  gV[0].build = function() {
    const map = build.apply(this, arguments);
    for (let row = 0; row < lowerFlight.length; row++) {
      for (const x of [42, 43]) map.hmap[29 + row][x] = lowerFlight[row];
    }
    for (let col = 0; col < upperFlight.length; col++) {
      for (const z of [32, 33]) map.hmap[z][44 + col] = upperFlight[col];
    }
    // This landing belongs to the high route: two players' widths to sidestep
    // an attacker, see into the trench, or deliberately take the lower flight.
    map.hmap[29][41] = 2.10;
    const arch=map.decor.find(d=>d.k==="hellGreatArch" && d.x===40 && d.z===30.8);
    if (arch) {
      // Both loads now bear on solid upper-floor masonry behind the works.
      arch.z=35.45;
      arch.w=7.8;
      arch.h=7.1;
    }
    const apse=map.decor.find(d=>d.k==="hellLancetShrine" && d.x===40 && d.z===39.7);
    if(apse) apse.k="cinderSluiceDampers";
    // Clear only the clutter that would now float in the mouth of the stair.
    map.decor = map.decor.filter(d =>
      !(d.k === "ember" && (d.x === 41 || d.x === 43) && d.z === 29) &&
      !(d.k === "bones" && d.x === 44 && d.z === 33)
    );
    return map;
  };

  const texels = /* CINDER_VIADUCT_TEXELS_BEGIN */ "Z2omYgVaZ2pnYmdiZ2JGYiZaRmJnYkZih2pGYgVaZ2JGYiZixFEFWgVaZ2pnaodqh2qHakZiZ2qocodqJlqHaqhqZ2pGYodqZ2qHaodqh2qHaodqqGpGYshyh2pnYodqqHJnasRRBVoFWodqh2qoaqhqZ2qHamdqqGqHakZiqHKHamdiZ2ImYqhyh2pGYkZih2pnYkZiJmJnYodqJlpnaqhyJmLlUUZiJmImWmdiqGqHaodqh2pnamdqqHJnamdih2qHaodqRmKocodqZ2qHamdqZ2ImYodqZ2qoamdqqGqockZixFFGYmdiRmKocodqyHLIcqhqqGqHaodqZ2Kocmdqh2pnYodqqGpnYmdiZ2JGYkZiZ2JnaiZiyHJGYshyh2rlUcRRqHKHakZih2qHamdqqHKHaqhyh2pnamdqJmJnYmdih2qHamdiRmJGYmdqqGqHamdiRmJnYmdqRmKockZiJlrEUUZih2pnamdqZ2omYshyqHJnaodqZ2pGYkZiRmKHaodqZ2pnakZiZ2rIcshyyHKHamdiZ2JnamdiqHJnaiZaxFHEUYdqh2qHaodqZ2rpeqhyZ2qocqhqZ2pGYqhq6XKoaodqqHJnYodqqHLIcshyZ2pnYmdqqGqHamdqBVrlWaRRxFGHaodqRmLpeodqqGrpcqhyyHJnaodqRmKoaqhyyHKocqhyh2pnakZixFFnakZiJmJGYmdqh2omYgVaBVrlWeVRh2pnamdiyHKoaqhyh2qHaqhyZ2qockZiZ2pnYmdqpFGockZiJmIFWgVaJloFWgVah2pnamdqJlqocgVa5VlGYmdqZ2omWshyyHKHamdqh2qocodqqHJGYqRRxFHEUeVZBVpGYmdiRmImWmdiJmJnYshyBVpGYgl7qHJnYgVaRmLlWWdqRmKHaul66XLIcqhyyHLIcgl7Z2KkUcRRxFHlWQVaRmJGYgVaJlpnYiZiBVpGYgVaZ2rIcodqJmLlWSZixFFnYmdiRmLpcqhyyHKocmdiqHKocqhypFHEUeVZxFEFWiZaY0kFWmdqRmJnYiZiyHKHashyyHKHaqRRpFFnagVaBVpGYqhyqHKHaqhyh2pnYqhyZ2pGYgVaxFHEUaRR5VEFWqRRJlrIciZaRmJGYsRRh2rIcqhqBVrEUeVZh2omYgVah2qHaulyyHLIcshyh2qocqhyRmJnYmdqRmLEUcRRxFEFWuVZJmIFWgVaJloFWqhyyHLlWQVaY0mkUUZiZ2pGYmdiqHLIcodqqHLIcmdqRmLIcmdiKoOocqhyyHKHamdqi4vpegl7yHLlWQVaBVqkUQVa5VGkUYNJpFHlWSZiRmKHaiqDyHImYmdqh2qHaqhq6XqHaul6CXtnashyyHIqg0qD6XpKg+l6h2pGYiZixFHlWaRRpFGDSYNJg0kFWiZi5Vlriwl7JmLIcqhy6Xqocul6yHJnaodqRmJnYiZiZ2oFWgl7qHKLiwl7KoNri0qDKoPlUSZih2qoaoNJRmJGYkZiJmIFWmdiJmJnYmdiyHIJe+VZRmJGYul6h2omYmdiKoNnaqhq6Xqocgl76XJKg6yT6XrIcshyyHImYuVZBVqDSeVZqGrpeshyJmLEUYNJJmImYkZiBVrpeshyJlpnaqhqRmJGYmdiyHLIciZiZ2qocsyTTqSLi4uL6Xqocodqg0nlWeVZJlomYiZaJlrEUWdiBVpGYiZaJmJGYiZaZ2JnaulyRmImYshyZ2JnYul66XrIcsyT6XqLi4uLSoMJe8hyi4uocgVayHJnashyh2qHaiZaZ2omYiZaRmLlWUZiRmLIciZaJmImWiZih2rpeodqZ2oJe8hyqHLIcodqCXuHakqDZ2rEUYdqZ2qHaqyLh2omWqhqh2omYuVZBVomWkZiyHJGYkZiZ2JGYiZaqGpGYshyh2qoaiqDZ2pnYmdqrJMqg8hyyHJGYmdiKoOocmuDyHJGYiZaRmImYgVaRmJnamdqRmImYmdiyHImYkZiZ2KHaodqqHLIckZiRmKocqhyqHIqg0qDqHLIckqDh2qocouLJlomWkZiJmIFWiZiZ2pnYkZiJmJGYmdqJmImYshy6XJnYshyh2omYodqh2qHamdiSoPIcqhy6Xoqg2dqh2pnasRRBVpnaiZiJmImYkZiJmImYiZiBVomYiZiJmImYqhqCXuHaiZayHKHamdih2pGYul6h2pnYqhyqGpnYshyZ2rEUQVaRmJGYkZiRmJnYiZiRmJGYiZiqGomYkZiRmLpegl7RmJGYgl7qHLIcul6yHKoashyqHLpeul6h2rIcqhypFGkUQVaRmImYiZih2pGYiZiJmJGYmdiJmImYkZih2qocmdqh2pnashyZ2rIcodqyHImYsRRh2oJe8hy6XqocsRRpFEFWiZiJmLIcodqZ2omWiZaRmJGYiZiRmJGYodqRmJnYodqh2qocmdqyHJGYgl7h2rlWQl76Xqocgl7qHLEUaRR5VnlWSZiqGpGYmdiZ2JnYmdqZ2ImYiZiRmKHamdqRmKHaodqyHKocqhyRmJGYqhyxFHpeqhqqHLpeqhq5VmkUQVaJmImYqhyqGpnYmdqZ2pnYkZih2pnYodqh2qHamdqRmJnYodqZ2KHaqhqh2qockZiBVqocqhqyHLIcsRRpFEFWkZiRmKHamdqRmJGYmdiZ2JnaiZaRmJnaodqh2pnamdiZ2qHaodqZ2qHaodqRmImYqhqqHKHaul6qHIGSgZKBkpoWuZJBkqtg2haB0oHSgZKB0qJYidSqWIGSsliJ1InUuZJ5knmSSdSJ1IHSuZJB1LmScZJpUFkOcZBaFonUidSaFrmSQZK5kknUgdKJ1IGSgZKJ1IHSspqB0poWgZKJ1InUuZJxkknUmhaJ1KJYgdK5knGSaVBZDmlQWhaJ1InUmha5kkGSuZJJ1IHSidSBkoGSidSB0rKagdKaFoGSidSJ1LmScZJJ1JoWidSiWIHSuZJxkmlQWQ5pUEnUmhaJ1IHSidSJ1LGSWhaJ1InUgZKaFoHSgdKaFoHSmhaBkonUgdKBkonUmhaR1IHSsliBkrmSSdSpUGlQcZJJ1InUgZKBkoGSidSCmsHSidSJ1IGSgdKB0pHUmhaJ1JHUkdSaFonUgdKaFonUgdK5kmpYgZK5kknUqVBpUHGQQZKB0rmScZB5kknUgtrB0onUgdK5kkHSgZKR1InUidSJ1IGSkdSJ1JHUsZJxkHmSQZKR1IGSuZJJ1KlQeZJpUEGSgdK5knGQeZJJ1ILawdKJ1IHSuZJB0oGSkdSJ1InUidSBkpHUidSR1LGScZB5kkGSkdSBkrmSSdSpUHmSaVBJ1InUidSB0onUidSxkknUmha5kknUgdKB0oHSkdSSFInUgdKJ1JoWmhaxkkGSidSqWIHSidSJ1InUgZKB0rmSQZKBkoGSkdSJ1IGSgZKJ1InUuZJ5kkGSidSiVonUmhaJ1JIUkhSJ1IGSsZBJ1InUolaBkoGSgdKB0oGSgdKxkEGSgZKBkpHUidSBkoGSidSJ1LmSeZJBkonUolaJ1JoWidSSFJIUidSBkrGQSdSJ1KJWgZKBkoHSgdKBkoHSsZBBkoGSgZKB0rmSaVBJ1LJYkdSBkrmScZBJ1JoWkdSB1InUmhaJ1JHUgZKpUFoWidSBkonUuZJBkrmSQdKxkHmSSdSBkonUgZKJ1IGSidSyWInUmhaBkoHSmhaaFonUidSR1InUmhaiVoGSgZKiWIGSgZKBkrmSQZKBkonUqVBB0oGSuZJqWJHUidS5kknUoliJ1InUgdKBkoHSidSB0onUidSB0poWkhSBkoHSolaBkrmSQZKBkoGSgdKR1LGSQZKBkrmSaliR1InUuZJJ1KJYidSJ1IHSgZKB0onUgdKJ1InUgdKaFpIUgZKB0qJWgZK5kkGSgZKBkoHSkdSxkkGSgdKBkorcydSBkonUuZJiVoHSidSBkoGSidSaFoHSidSqWIHSmhaB1IHSidSJ1IHSidS5kknUuZJ5kkGSgZK5kknUkdSaFoHSidSB0rGSYliaFqlQQdKR1JoWidSJ1JoWmhaJ1KpYkdSR1IGSidSB0oGSuZJJ1IGSgZKxknGSUdSJ1JHUmhaB0onUgdKxkmJYmhapUEHSkdSaFonUidSaFpoWidSqWJHUkdSBkonUgdKBkrmSSdSBkoGSsZJxklHUgdKJ1IHSqVBJ1KpYgZK5knmSeZJJ1JoWgdKB1IHUidSSFIHSmhaJ1InUgZKJ1InUidSJ1InUgZKBkqlQcZJiWLmSQdKBkrGSSdSJ1IGSgdKpUEGSgZKaFoHSidSJ1IHSgZKB0onUidSB0oGSgdKJ1InUuZJJ1LmSeZJ5knmSYlaJ1InUidSxkHmSYla5knGQaVBB0onUgdKaFoHUmhaBkonUgdKaFpoWidSaFonUidSB0oHSgZK5knGSaVBxkFoWidSJ1InUsZB5kmJWuZJxkGlQQdKJ1IHSmhaB1JoWgZKJ1IHSmhaaFonUmhaJ1InUgdKB0oGSuZJxkmlQcZBaFqlQaVBpUGlQaVBR1LmSeZJpUHmScZBBkonUidSB0oGSgdKB0oHSidSJ1IHSkdSJ1IGSkdSB0rmSaVBxkmlQQdShDmlQcZBpUGEOeZJ5kkGSsZJBkrGSSdSJ1JoWsZBaFpHUidSxkknUkdSJ1InUgdSJ1IHSidS5knmSaVBpUEGSoQ5pUHGQaVBhDnmSeZJBkrGSQZKxkknUidSaFrGQWhaR1InUsZJJ1JHUidSJ1IHUidSB0onUuZJ5kmlQaVBBkoGSqVBpUGlQaVBhDmlQcZJ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YkmjUUJBg1GDSYNJg0mDSWJJo1GDSaNRo1FiSWJJg1GDSeRZg0ngOKuTYkkhQaNRYkkhQWJJYkmDSUZio1FiSWJJo1FCQYNRg0mDSYNJg0liSaNRg0mjUaNRYkliSYNRg0nkWYNJ4DgxxYNJQkGDSaNRo1GDSWJJo1GDUUJBg0mjUaNRYkmjUWJJYkmDSWJJQkEhQUJJg0liSWJJg0mDSWJJg0liSeA4McWDSUJBg0mjUaNRg0liSaNRg1FCQYNJo1GjUWJJo1FiSWJJg0liSUJBIUFCSYNJYkliSYNJg0liSYNJYkngOEJBYkkhQYNJg0mDSYNJYkklYuRZIUFCQUJBg0khQWJJQkGjUWJJYkkhQUJBo1GDSWJJo1GDSYNJg0khQSFB4DhCQWJJIUGDSYNJg0mDSWJJJWLkWSFBQkFCQYNJIUFiSUJBo1FiSWJJIUFCQaNRg0liSaNRg0mDSYNJIUEhQeA4QUFiSQA5YkliSUJJg0klYgVi5FmjUYNJIUHDUYNJYkliSWJJQkliSWJJg0liSYNJIUGDSUJBYkliSUJB4DigMEFBYkkAOWJJYklCSYNJJWIFYuRZo1GDSSFBw1GDSWJJYkliSUJJYkliSYNJYkmDSSFBg0lCQWJJYklCQeA4oDBBQYNJIUGDSYNJQkFCQSVio1GjUYNJZmpiSYNJxFGDSYNJg0mDSaNRg0mDSWJJg0lCQYNJg0liSaNRIUEAOYAoQUGDSSFBg0mDSUJBQkElYqNRo1GDSWZqYkmDScRRg0mDSYNJg0mjUYNJg0liSYNJQkGDSYNJYkmjUSFBADmAKEFBg0khQYNJg0lCQUJBJWKjUaNRg0lmamJJg0nEUYNJg0mDSYNJo1GDSYNJYkmDSUJBg0mDSWJJo1EhQQA5gChiScAwIUFiSYNJYkmjUaNRg0liSUJBYknkWWJJYkmDScRRo1GjUWJJ5FliSaNRo1FCQaNRo1FiSeRZg0ngOIAoiFqIWohaiFqIWqliqWKpYohaiFqIWqliqWKpYqliqWJoWmhaaFpHUkdSjHuMe4x7iFqIWohaBkoGSqVBpUGlQSdSJ1InUkdSR1InUidSJ1JHUkdSR1KJYoliiFqIWohaaFpoWmhaR1JHUqliqWKpYqliqWKpYsZJxkmlQaVBpUFHUkdSR1JHUkdSyWLJYsliaFpoWmhaaFpoWsliyWLJYupq6mrqakdSR1JHUkdSR1KIWohaiFrGScZJpUGlQaVBiFqIWohaaFpoWmhaaFpoWsliyWLJYkdSR1JoWmhaaFrqaupq6mrJYsliS3NLc0tz7ovui+6L5knmSaVBpUGlQYliiWKJYohaiFrJYsliyWLJYsliyWKpYqli6mrqaupqCmsKawpr6mrqaqliqWKpYkdSR1JHUuZJ5kmlQaVBpUGIWohaiFpoWmhaiFqIWohaiFqIWohaiFqIWohaiFqIWohaiFqIWohaiFpIWkhaSFqIWohaiFonUidSpUGlQaVBaFpoWmhaaFpoWmhaaFpoWohaiFqIWohaiFrJYsliyWKIWohaiFrJYsliTHtMe0x7THtMe0x7xknGSaVBpUGlQUdSR1JHUidSJ1JIWkhaSFpoWmhaaFpoWmhaaFpoWmha6mrqaupqyWLJYohaiFqIWspqymrKasVBxUGlQaVBpUGIWohaiFqIWohaiWKJYoliCmsKawprR1JHUqliqWKpYsliyWLJYsliyWJMe0x7THsrcytzK3PFQcVBpUGlQaVBiWKJYoliqWKpYmhaaFpoWspqymrKaupq6mrqaupq6mqJYoliiWKJYolibHtse2x7iFqIWohapUGlQaVBpUGlQaliqWKpYohaiFqJYoliiWKIWohaiFrJYsliqWKpYqliiWKJYoliiFqIWoliiWKJYmhaaFpoWoVBhUGEOYQ5hDkLcwtzC3OJYoliK3MrcytziFqIWohaqWKpYoliiWKJYkdSR1JHUkdSR1LJYsliyWInUidSJ1KEOYQ5pUGlQaVBR1JHUkdSiWKJYupq6mrqasliyWLJYmhaaFrJYsliyWILcwtzC3OpYqli7ovui+6LR1JHUkdSpUGlQaVBpUGlQYliiWKJYoliiWLJYsliyWKpYqliqWLJYsliyWLJYsliiWKJYoliyWLJYs2DzYPNg4haiFqIWqVBpUGlQaVBpUFoWmhaaFqJYoliaFpoWmhaiFqIWoha6mrqaktzS3NLc6liqWKpYqliqWLqaupq6mpIWkhaSFqFQYVBpUGlQaVBaFpoWmhayWLJYupq6mrqasliyWLJYsliyWILcwtzC3Pui+6L7osOjA6M8qzyrPKsJ1InUidShDmEOYVBhUGFQaliqWKpYoliiWKpYqliqWKJYoliiWKJYoliaFpoWmhaR1JHUkdSaFpoWqliqWKpYkhaSFpIWoVBhUGEOYQ5hDkrcytzK3PJYsliCmsKawprqWKpYqliaFpoWmx7bHtse6liqWKpYgprCmsrcytzK3MnUidSJ1KlQaVBpUGlQaVByWLJYslirYOtgytzK3Mrc4haiFqIWsliyWLqaupq6mqpYqliqWKpYqliqWKpYqliJ1InUidSpUGlQaVBpUGlQaliqWKpYupq6moKawprCmupYqliqWKIWohayWLJYsli6mrqaupqbHtsew6MDowOjAZKBkoGSqVBpUGlQaVBpUGIWohaiFpHUkdSqWKpYqliiWKJYoliiWKJYkdSR1JHUkdSR1JHUoliiWKJYoliiWIGSgZKBkqlQaVBpUGlQaVBJ1InUidSxUHFQUdSR1JHUmhaaFpoWidSJ1InUidSJ1JHUkdSR1JoWmhaR1JHUkdSBkoGSgZKpUGlQaVBpUGlQUdSR1JHUkdSR1InUidSJ1JHUkdSR1JHUkdSR1JHUkdSR1JHUkdSR1JHUmhaaFpoWuZJ5knmSaVBpUGlQaVBpUEnUidSJ1InUidSR1JHUkdSaFpoWmhaJ1InUkdSR1JHUkdSR1JHUitzK3NLc0tzS3PmSeZJ5kmEOYQ5hDmEOYQ5aFpoWmhaR1JHUohaiFqIWgZKBkoGSmhaaFonUidSJ1LmSeZJ5klHUkdSSFpIWkhaxUHFQcVBhDmEOYQ5hDmEOQZKBkoGSidSJ1JHUkdSR1JHUkdSR1InUidSB1IHUgdSR1JHUkdSjHuMe0dSR1JHUuZJ5knmSYQ5hDmEOYQ5hDlHUkdSR1LmSeZJiFqIWohaR1JHUkdSJ1InUkdSR1JHUidSJ1InUkdSR1InUidSJ1LmSeZJ5kmlQaVBpUGlQaVBR1JHUkdSaFpoWqliqWKpYohaiFqIWidSJ1LmSeZJ5knGScZJxknui+6LR1JHUkdSJ1InUidSpUGlQaVBpUGlQUdSR1JHUkdSR1JHUkdSR1JHUkdSR1JHUkdSJ1InUidSJ1InUidSL5QvlIhaiFqIWgZKBkoGSoVBhUGEOYQ5hDnmSeZJ5kknUidSR1JHUkdSR1JHUkdSJ1InUkdSR1JHUidSJ1InUsliyWIGSgZKBkrFQcVBxUGEOYQ5hDmEOYQ5R1JHUkdSxUHFQQZKBkoGSkdSR1JHUidSJ1IGSgZKBkrmSeZJ5klLc0tz5knmSeZJxUHFQcVBpUGlQaVBpUGlQWhaaFpoWkdSR1KpYqliqWIGSgZKBkonUidSaFpoWmhaJ1InUidSymrKagtzC3MLc8VBxUHFQaVBpUGlQaVBpUFGo6SSo5Ilo8SS5JIFm+SSBZsFmwWbJaMlo4erJaNmq2arBZsFmyWjBZsFmwWbBZslowWbBZsFmyWjBZuDigWbBZuDisSSJaMlowWbBZslowWbJqMloyajJaNmowWbZqOHq0ajBZsloyWjJaMlo2arJaMFmyajBZsFmyWjxJLEkgWbg4rEkiWjJaMFmwWbJaMFmyajJaMmoyWjZqMFm2ajh6tGowWbJaMloyWjJaNmqyWjBZsmowWbBZslo8SSxJIFm4OKxJIloyWjBZsFmyWjBZsmoyWjJqMlo2ajBZtmo4erRqMFmyWjJaMloyWjZqslowWbJqMFmwWbJaPEksSSpJJiisSSg4oFm+SS5JLlmmajBZsFmwWbBZvkmgWbJaMmoyajBZslo+SSJqPkkiWjJqMFmwWb5JLkkgWbg4rEkqSSYorEkoOKBZvkkuSS5ZpmowWbBZsFmwWb5JoFmyWjJqMmowWbJaPkkiaj5JIloyajBZsFm+SS5JIFm4OKxJLEkmKK5JKkkoOKxJKkkuSSRqPkksSS5JImowWbxJImo2ajBZvkmgWbJaMFm+SSJaMmo+SS5JIFmyWjJqODiqOSxJJiiuSSpJKDisSSpJLkkkaj5JLEkuSSJqMFm8SSJqNmowWb5JoFmyWjBZvkkiWjJqPkkuSSBZsloyajg4qjksSSYorkkqSSg4rEkqSS5JJGo+SSxJLkkiajBZvEkiajZqMFm+SaBZslowWb5JIloyaj5JLkkgWbJaMmo4OKo5LkkoOKxJLkksSS5ZolowWbJaPkkqSS5JrkmsSSY4rkmgWbBZslowWbBZsFmwWbo5IFm4OKxJIFmwWbg4qDiqSS5JKDisSS5JLEkuWaJaMFmyWj5JKkkuSa5JrEkmOK5JoFmwWbJaMFmwWbBZsFm6OSBZuDisSSBZsFm4OKg4qkkuSSg4rEkuSSxJLlmiWjBZslo+SSpJLkmuSaxJJjiuSaBZsFmyWjBZsFmwWbBZujkgWbg4rEkgWbBZuDioOKpJKkkqSSYoqkksSSpJLEkqSSo5KkkmKCg4qDioOKo5KkkoOKpJKkkoOKo5KkkqSSYoqkkoOKpJKDiqOSg4qDiuSSpJKkkmKKpJLEkqSSxJKkkqOSpJJigoOKg4qDiqOSpJKDiqSSpJKDiqOSpJKkkmKKpJKDiqSSg4qjkoOKg4rkkkajpJJGoyajJaOkkuSSBZslowWb6LuHq0ajRqNGoyajJqNGoyWjBZsFmwWbxJKjkoOKo5LEkoOKYoJigoOKxJJGo6SSRqMmoyWjpJLkkgWbJaMFm+i7h6tGo0ajRqMmoyajRqMlowWbBZsFm8SSo5KDiqOSxJKDimKCYoKDisSSRqOkkkajJqMlo6SS5JIFmyWjBZvou4erRqNGo0ajJqMmo0ajJaMFmwWbBZvEkqOSg4qjksSSg4pigmKCg4rEkmarh6uns+zcp7NGo6izqLMJvMizaszIs+i7p7MpxMiz6LvIs8izh6tGo4erZ6tnq0ajp6vIs8izp7Onq2erh6tmq4erp7Ps3KezRqOos6izCbzIs2rMyLPou6ezKcTIs+i7yLPIs4erRqOHq2erZ6tGo6eryLPIs6ezp6tnq4erZquHq6ez7Nyns0ajqLOoswm8yLNqzMiz6LunsynEyLPou8izyLOHq0ajh6tnq2erRqOnq8izyLOns6erZ6uHqym8SsRKxMizCbyns4erh6tGo8izSsQpxOm76bsJvKez6LsJvGrMyLOns+m7yLOHq0ajh6uns4erRqNGoyWjRqMpvErESsTIswm8p7OHq4erRqPIs0rEKcTpu+m7Cbyns+i7CbxqzMizp7Ppu8izh6tGo4erp7OHq0ajRqMlo0ajasxKxOm7Cbzpu8izyLMpxKezSsRqzAm8asyLzErEKcQpxIvMp7PIs0rEaswJvOm76Lvpu8izKsRqzGrMyLOns2rMSsTpuwm86bvIs8izKcSns0rEaswJvGrMi8xKxCnEKcSLzKezyLNKxGrMCbzpu+i76bvIsyrEasxqzMizp7NqzErE6bsJvOm7yLPIsynEp7NKxGrMCbxqzIvMSsQpxCnEi8yns8izSsRqzAm86bvou+m7yLMqxGrMaszIs6ezSsTpu+m7KsSnq8izZ6vou6er6LsJvKezCbxqzAm8yLPIs0rESsRKxKvMSsSns+m7yLMpxAm8q8xKxErEZ6unq0rE6bvpuyrEp6vIs2er6Lunq+i7Cbynswm8aswJvMizyLNKxErESsSrzErEp7Ppu8izKcQJvKvMSsRKxGerp6tKxOm76bsqxKeryLNnq+i7p6vouwm8p7MJvGrMCbzIs8izSsRKxErEq8xKxKez6bvIsynECbyrzErESsRnq6erq8xqzErESsTouyrEq9Ss1GrMi8ys1GvMi8xKxGrMKcRqzKzUzNSs1ErEi8xKxErECbxKxErESsRqzErECbzpu6vMasxKxErE6LsqxKvUrNRqzIvMrNRrzIvMSsRqzCnEasys1MzUrNRKxIvMSsRKxAm8SsRKxErEasxKxAm86buLzOzc7NxrzMzUb+2v9avUj+1u5WrMaszpu6ezqLOLzGrEKbxqzErESsRKxCnE6Lvpu8iz6Luos+i76btrzErEi8zs3Ozca8zM1G/tr/Wr1I/tbuVqzGrM6buns6izi8xqxCm8asxKxErESsQpxOi76bvIs+i7qLPou+m7a8xKxKRhxGGkWWNZIlFCUeVpBWpnei6sa5NneiZyRnImciZqpGGkYYNZg1mkWYNZpGHEYSZqxGHlacRhxGEFaqRhg1nEYUJRg1ljUQFJAUmkYUZyqHoqk4d6Z3pnekZyRnLEYYNZpGGDWYNZg1mDWYNZY1kFasRhpGHEYaRhg1mDWYNZxGGkWSZyxGFCUUJRJnJneqRhg1ljWaRhpGFjWUJRIlEiSWNRg1mDWaRhg1ljWWNRg1mkYYNZpGGkYYNZg1mkYaRZpFnEYaRZY1FCUWNRQlEiUQFJ4UjhSMBAwEDhQAFJIklCUUJRIlFCUQFJAUkBSQFJAUnhSMRhh3pncsiCqIJjWWNRJnLlaUJR4UhCUaRhpGFrk6iCBWqDWUJRpGGDWWNZY1kFakZy5WGDWWNZQlFjWSqTCYvMo2ubh3pGcoNZQlFCUYNZY1EBScBAAUmDWSZySpPIgod6JnLlaSZyRnImcuVpBWoFauVhBWoFauVhh3rIgiqLa5sqk6iC5WljWUJRIlGDWUJRAUkBSQVqBWomciqLJnIFagVqBWpGcgVqBWomckZyRnLIgumKrKOogiZyZ3oqk2ubBWrlYaRh5WlCUUJRg1ljUSJRAUnEYeVhZ3pKkwVqJnImcsRhxGEFauVpJnJGciqTrKOHeod6Z3pnesiC6YIqi6iCqIJneod65WnEYWNRpFkiUUJRJnJGcod67auoekZyBWomcuVhyIKHesiC6YqoeiZqxGFGcqh6Z3pneiZySpNrk4d6qHpGcqRhg1lCUcRhpFlCUSZyRnKogoubZ3Jnemd6BWqoeumCqIJnesiCJnKkYeVpBWrIgiZyBWomckZyyIJnegVqQlHEYYNZQlHEYYNZ4UjEYeVpRnKsm6iCb7TxzGubqIIJi0ZyZ3oqk0ZyJnImaod6qHrIggVqJmpGcgmL5WnEYcRhxGGkWUJRxGGDWeFIpGEmciZyJnLlae2ri5uogumKh3oFaiZyqHpGciZqBWoFamd6RnLEYQVqBWoFaqRhY1mDWcRhpFlCUaRZxGHhSEZy5WkmcoNZBWoJi4d6yILpiod6RnJnesiCZ3oFaiZqRnKHeiZyRnIFamd6RnLEYcRhxGGDWWNRpFnlaYNZIlHEYcRh5WFjWYNZqIKoemd6h3oFakZyZ3pnegVqJmrlaQVqRnLlYQVqRnJGcod6xGGkWcRhY1nEYaRhxGFjWQFJpGEFagVqpGGkYYd6RnJnemd6RnJneqh6Z3pneiZyZ3oFaod6Z3omciZq5WEJi+VppGHEYYNZCYukYaRZQlEBSemCqIIFaoNZg1mHeumCBWomaiZyZ3oFamd6Z3omcod6qHomaqiCZ3omciZqRnImcuVpxGFjWUZypGGDWWNZIlFneod6Z3qkYaRhRnLpiiZy5WlGckZyRnImaqh66YrpisiCJmrpiod6JmpGcqyjh3omckZyIlHlaaRhxGFjUQFJZ3pGcqiC5WHEYayj6YomcgVqh3qHeiZqRnJnekZyRnJnekZyh3qogmd66Yrpiod6JnLlYUJRxGGkYYNZIlEBSUZyZ3prm+VhBWprm2d6Z3JnesiCyIImcqiCh3pGcod6Z3pGcqiCh3pGcqiCCYsmcqRZQlFCUcRhQlGDWQFJ4UjEYYd6CYtjWYNZRnJGckZyRnKoekZyxGGogmd6RnKoemd6RnJGcmdyJmoFasiCRnLEYeVhpGFGcsRhpFkiUQFJ5WmHeqh6pGFCUQVqRnKHemd6h3pGcod6h3pnegmLyIKHeiZyRnJneiZq5WGoekZy5WnlaYNZ5WljWWNZg1kiUcRhZ3qDWWNZAUlCUcRhZ3qoeiZyJmpneiZyRnLpiqiCJnIFaiZqBWrEYeVhJnLlaWNZg1ljWYNZAUnhSOFI4UgFamdypGHEYYNZCYvIgmd6h3oFaqiCZ3qHesRhh3qogmd6JmpGciZyh3prk8iC5WGDWWNZ4UjhSOFIAUlCUYNZRnKHeod6Z3rEYSqT6YpnesiCh3qHeod6BWrEYWd6qIKHeod6RnJneqiCCYvIgqiC5WmkYWNRY1FCUYNZg1nlYaiCyILpiuVhxGFnegVqqIIJi0ZyqIKHegVq5Wlnemd6Z3pnekZyRnJGcqh6yIKoesRhBWqDWUJRpGEmaoNZ5WnIgsiC6YqkYSJR5WHpiqiCSpOogqiCyIImcuVpBWqoeod6JnJncsRhZ3qHeumK6YoFasiCg1mkYSZqBWomakZyKpNGciZyRnJCUYd6BWomamd6qIJGcod6RnJGcod6Z3pGciZyRnKogiZyJmoqk8iC5WnlYaRhg1lGcsiCJnKHesiCRnImcmd6IlGoesiCJnJnekZyJnJGciZqBWpGciZyBWpGciZyqHoFaiZyCYuogsRhg1nEYYNZJnImckZyh3pKk0ZyqIKogoNZZ3KoekZyJnLEYYNZJmpGckZyJnIFaiZqyIIJi6iCRnJneqh6BWrlYcRhxGGkYSZyxGFGcod66YrIgsiCRnKDWUZyRnIFagVqBWrlaSZqBWrlacRhxGEmamd6RnJnegVqZ3pnekZyJnLlYSZy5WEmcgVqRnKHeqiCJnLlYWNZQlEFaumC6YrIgmuTJnImaiZyRnImcod6qIJGcmd6pGHEYYd6SpNrm2ubqHomciZyRnIFaiZyqHpneiZyxGHEYUJR5WkFaiZyqILIgiZyBWomcmd6JnJGcmd6BWqHegVqRnJGciqTh3rEYaRh" /* CINDER_VIADUCT_TEXELS_END */;
  const tileSize = 32, tileCount = 6, pitch = tileSize + 2;
  const STONE = 0, TREAD = 1, SILL = 2, IRON = 3, BRONZE = 4, RUST = 5;
  function makeAtlas() {
    const bytes = atob(texels);
    const texture = Z(e0(ctx => {
      const rgba = ctx.createImageData(pitch * tileCount, pitch);
      for (let tile = 0; tile < tileCount; tile++) {
        for (let v = 0; v < pitch; v++) for (let u = 0; u < pitch; u++) {
          const x = Math.max(0, Math.min(tileSize - 1, u - 1));
          const y = Math.max(0, Math.min(tileSize - 1, v - 1));
          const src = 2 * ((tile * tileSize + y) * tileSize + x);
          const color = bytes.charCodeAt(src) | (bytes.charCodeAt(src + 1) << 8);
          const dest = 4 * ((v * tileCount + tile) * pitch + u);
          rgba.data[dest] = (color >> 11) * 255 / 31;
          rgba.data[dest + 1] = ((color >> 5) & 63) * 255 / 63;
          rgba.data[dest + 2] = (color & 31) * 255 / 31;
          rgba.data[dest + 3] = 255;
        }
      }
      ctx.putImageData(rgba, 0, 0);
    }, pitch * tileCount, pitch));
    texture.name = "cinderSluiceMasonryAndMetal";
    texture.colorSpace = ha;
    texture.minFilter = YC;
    texture.generateMipmaps = true;
    return texture;
  }

  function buildSluice(scene) {
    const positions = [], uvs = [], colors = [], indices = [];
    const uvCorners = [[0,0], [1,0], [1,1], [0,1]];
    function quad(points, tile, light) {
      const first = positions.length / 3;
      for (let i = 0; i < points.length; i++) {
        const [x,y,z] = points[i], [u,v] = uvCorners[i];
        positions.push(x, y, z);
        uvs.push((tile * pitch + 1.5 + u * (tileSize - 1)) / (tileCount * pitch),
          (1.5 + v * (tileSize - 1)) / pitch);
        const glow = Math.exp(-((x - 88) ** 2 / 14 + (z - 66) ** 2 / 32));
        const shade = light * (.89 + .07 * Math.min(1, y / 3));
        colors.push(shade + glow * .10, shade + glow * .023, shade * .96);
      }
      indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
    }
    function box(x0, x1, y0, y1, z0, z1, tile, light = 1) {
      quad([[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]], tile, light);
      quad([[x1,y0,z1],[x0,y0,z1],[x0,y1,z1],[x1,y1,z1]], tile, light * .82);
      quad([[x0,y0,z1],[x0,y0,z0],[x0,y1,z0],[x0,y1,z1]], tile, light * .72);
      quad([[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0]], tile, light * .86);
      quad([[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]], tile, light * 1.12);
    }
    // Tread joints are staggered between landings. The nosing projects only
    // three centimetres past its native riser, so the seen and walked edges agree.
    function course(x0, x1, z0, z1, y, previous, east, row) {
      const run = east ? z1 - z0 : x1 - x0;
      let start = 0, brick = 0;
      while (start < run - .025) {
        const length = brick === 0 && row % 2 ? .71 : 1.28 + .12 * Math.sin(brick * 7 + row);
        const end = Math.min(run, start + length);
        if (end - start < .05) break;
        const lo = start + .009, hi = end - .009;
        const a = east ? x0 : x0 + lo, b = east ? x1 : x0 + hi;
        const c = east ? z0 + lo : z0, d = east ? z0 + hi : z1;
        const light = .88 + .13 * Math.sin(brick * 2 + row * 8);
        quad([[a,y+.012,c],[b,y+.012,c],[b,y+.012,d],[a,y+.012,d]], TREAD, light);
        if (y > previous) {
          const chip = .045 + .20 * (.5 + .5 * Math.sin(row * 11 + brick * 7));
          if (east) {
            box(a-.026, a+.12, y-.053, y+.016, c+chip, d, SILL, light);
            quad([[a-.012,previous,c],[a-.012,previous,d],[a-.012,y-.061,d],[a-.012,y-.061,c]], STONE, light*.87);
          } else {
            box(a+chip,b,y-.053,y+.016,c-.026,c+.12,SILL,light);
            quad([[a,previous,c-.012],[b,previous,c-.012],[b,y-.061,c-.012],[a,y-.061,c-.012]],STONE,light*.87);
          }
        }
        start = end; brick++;
      }
    }
    lowerFlight.forEach((y,i) => course(84,88,58+i*2,60+i*2,y,i ? lowerFlight[i-1] : 0,false,i));
    upperFlight.forEach((y,i) => course(88+i*2,90+i*2,64,68,y,i ? upperFlight[i-1] : lowerFlight.at(-1),true,i+5));
    course(82,84,58,60,2.10,2.10,false,5);
    for(let i=0;i<3;i++) {
      const x=82+i*.66;
      box(x+.008, x+.65, 1.85,2.106,57.965,58.035,STONE,.98+i*.045);
      box(83.968,84.035,1.85,2.106,58+i*.66+.009,58+(i+1)*.66-.01,STONE,1.01);
    }

    // A retaining wall has stone returns at the corner where the path turns.
    // Only dress the exposed surfaces below the existing playable upper floor.
    function retainingWall(x, z, length, axis, floor, top) {
      for (let row = 0, y = floor; y < top - .04; row++) {
        const nextY = Math.min(top, y + .43);
        let s = 0, brick = 0;
        while (s < length - .03) {
          const end = Math.min(length, s + (row % 2 && brick === 0 ? .53 : 1.14));
          const a = s + .014, b = end - .012;
          if (b > a && axis === "x") box(x+a,x+b,y+.011,nextY-.013,z-.03,z+.022,STONE,.88+(row%3)*.035);
          if (b > a && axis === "z") box(x-.022,x+.03,y+.011,nextY-.013,z+a,z+b,STONE,.65+(row%3)*.04);
          s = end; brick++;
        }
        y = nextY;
      }
    }
    for (let i = 1; i < lowerFlight.length; i++) retainingWall(84,58+i*2,2,"z",lowerFlight[i],2.10);
    for (let i = 1; i < 3; i++) retainingWall(88,58+i*2,2,"z",lowerFlight[i],2.10);
    retainingWall(84,68,4,"x",1.05,2.10);
    retainingWall(88,68,2,"x",1.40,2.10);
    retainingWall(90,68,2,"x",1.75,2.10);

    // The old sluice gear is an open, double-sided casting. Its boss and axle
    // stand proud on both banks, with bolted fishplates joining six cast arcs.
    const cx = 85.75, cy = 3.72, cz = 68.65;
    function polar(radius, angle, depth) {
      return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle), cz + depth];
    }
    function band(inner, outer, a, b, front, back, tile, light) {
      const ao = polar(outer,a,front), bo = polar(outer,b,front), ai = polar(inner,a,front), bi = polar(inner,b,front);
      const ao2 = polar(outer,a,back), bo2 = polar(outer,b,back), ai2 = polar(inner,a,back), bi2 = polar(inner,b,back);
      quad([ai,ao,bo,bi],tile,light); quad([bi2,bo2,ao2,ai2],tile,light*.80);
      quad([ao,ao2,bo2,bo],tile,light*1.05); quad([bi,bi2,ai2,ai],tile,light*.70);
    }
    function plate(outline, front, back, tile, light) {
      const side = (point,z) => [point[0],point[1],cz+z];
      quad(outline.map(v=>side(v,front)),tile,light);
      quad(outline.map(v=>side(v,back)),tile,light*.85);
      for (let i=0;i<4;i++) {
        const a=outline[i], b=outline[(i+1)%4];
        quad([side(a,front),side(b,front),side(b,back),side(a,back)],tile,light*.85);
      }
    }
    const tau = Math.PI * 2, radius = 2.23;
    for (let i=0;i<36;i++) {
      const a = i*tau/36, b=(i+1)*tau/36;
      band(radius-.235,radius,a,b,-.155,.155,IRON,1.03+.16*Math.sin(i*1.97));
      band(radius-.054,radius+.008,a,b,-.170,.167,BRONZE,1.13+.25*Math.cos(a));
      band(.01,.39,a,b,-.23,.23,IRON,1.05);
      if (i%6===0) band(radius-.24,radius+.025,a-.063,a+.063,-.177,.174,RUST,1.12);
    }
    for(let i=0;i<6;i++) {
      const a=i*tau/6+Math.PI/2, dx=Math.cos(a), dy=Math.sin(a);
      const corner=(r,w)=>[cx+r*dx-w*dy,cy+r*dy+w*dx];
      plate([corner(.26,-.162),corner(radius-.13,-.102),corner(radius-.13,.102),corner(.26,.162)],-.105,.11,IRON,1.19);
      plate([corner(.40,-.15),corner(radius-.15,-.10),corner(radius-.15,-.081),corner(.40,-.119)],-.115,-.105,BRONZE,1.04);
    }
    // Front-facing cylinders for the axle boss and bronze fasteners.
    function rivet(x,y,r,front,back,tile,light,sides=8) {
      for(let i=0;i<sides;i++){
        const a=tau*i/sides, b=tau*(i+1)/sides;
        const p=[x+r*Math.cos(a),y+r*Math.sin(a)],q=[x+r*Math.cos(b),y+r*Math.sin(b)];
        quad([[x,y,cz+front],[...p,cz+front],[...q,cz+front],[x,y,cz+front]],tile,light);
        quad([[...p,cz+front],[...q,cz+front],[...q,cz+back],[...p,cz+back]],tile,light*.73);
        quad([[x,y,cz+back],[...q,cz+back],[...p,cz+back],[x,y,cz+back]],tile,light*.76);
      }
    }
    rivet(cx,cy,.246,-.30,.29,BRONZE,1.07,10);
    for(let i=0;i<6;i++){
      const a=i*tau/6;
      rivet(cx+Math.cos(a)*.321,cy+Math.sin(a)*.321,.036,-.263,.255,BRONZE,1.28,5);
      rivet(cx+Math.cos(a)*(radius-.10),cy+Math.sin(a)*(radius-.10),.049,-.204,.193,BRONZE,1.27,6);
    }
    // Stone plinth, bearing blocks, cylindrical counterweight and hanging chain.
    box(cx-2.70,cx+2.70,2.085,2.40,cz-.35,cz+.41,STONE,.87);
    // The axle seats in the bearing on the opposite bank-facing side; leave
    // daylight around it so the mechanism reads when approached in reverse.
    box(cx-.33,cx+.33,2.40,cy-.09,cz+.18,cz+.41,STONE,.76);
    rivet(cx,cy,.22,.16,.45,RUST,1.18,12);
    for(const sign of [-1,1]){
      const at=cx+sign*2.27;
      box(at-.47,at+.47,2.40,2.62,cz-.39,cz+.44,SILL,.82);
      box(at-.35,at+.35,2.62,cy+.03,cz-.30,cz+.33,STONE,1.02);
      box(at-.42,at+.42,cy+.03,cy+.17,cz-.38,cz+.39,SILL,1.16);
      box(at-.15,at+.15,cy-.18,cy+.13,cz-.42,cz-.295,IRON,1.03);
      for(const off of [-.09,.09]) rivet(at+off,cy-.04,.034,-.44,-.402,BRONZE,1.17,5);
    }
    const chainX=cx+.76,chainZ=cz-.06;
    for(let i=0;i<5;i++){
      const top=cy+radius-.23-i*.087;
      if(i%2) box(chainX-.021,chainX+.021,top-.12,top,chainZ-.047,chainZ+.047,RUST,1.15);
      else {
        for(const dx of [-.035,.035])box(chainX+dx-.010,chainX+dx+.010,top-.095,top,chainZ-.012,chainZ+.012,BRONZE,1.00);
        box(chainX-.042,chainX+.042,top-.10,top-.080,chainZ-.012,chainZ+.012,IRON,1.2);
      }
    }
    const weightBottom=cy+radius-1.04;
    box(chainX-.15,chainX+.15,weightBottom,weightBottom+.37,chainZ-.105,chainZ+.105,IRON,1.25);
    box(chainX-.16,chainX+.16,weightBottom,weightBottom+.05,chainZ-.112,chainZ+.112,BRONZE,1.14);

    const geometry=Z(new h0());
    geometry.setAttribute("position",new y0(new Float32Array(positions),3));
    geometry.setAttribute("uv",new y0(new Float32Array(uvs),2));
    geometry.setAttribute("color",new y0(new Float32Array(colors),3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    const material=Z(new $e({map:makeAtlas(),vertexColors:true,side:hi,toneMapped:false}));
    const mesh=new pt(geometry,material);
    mesh.name="prologueCinderSluice"; scene.add(mesh);
    // Native movement uses ground footprints; shots respect height above grade.
    const housings = [
      {x0:cx-2.70,x1:cx+2.70,z0:cz-.35,z1:cz+.41,y1:.30},
      ...[-1,1].map(s=>({x0:cx+s*2.27-.42,x1:cx+s*2.27+.42,z0:cz-.39,z1:cz+.41,y1:cy+.17-2.1}))
    ];
    for(const body of housings){
      for(let z=Math.floor(body.z0/P);z<=Math.floor(body.z1/P);z++)
        for(let x=Math.floor(body.x0/P);x<=Math.floor(body.x1/P);x++){
          const k=jM(x,z), list=v.masses.get(k);
          if(list)list.push(body);else v.masses.set(k,[body]);
        }
    }
  }
  const decorate=FJ;
  FJ=function(scene,map) {
    const value=decorate.apply(this,arguments);
    if(T.level===0) buildSluice(scene);
    return value;
  };
})();
/* PROLOGUE_CINDER_VIADUCT_END */
