/* ASH_CLOISTER_LAVABO_BEGIN */
// A monastery's communal wash court joins the graveyard to the western aisle
// of the nave. The original east processional route still runs beside it.
(() => {
  const level = 9;
  const courtRows = [
    // z, west, east, pavement height
    [56,45,48,1.40], [57,45,48,1.65], [58,45,48,1.90], [59,45,48,2.15],
    [60,45,48,2.40], [61,45,48,2.10], [62,42,48,1.80], [63,41,48,1.50],
    [64,41,48,1.20], [65,41,48,1.20], [66,42,48,1.20], [67,44,48,1.20]
  ];
  const buildAbbey = gV[level].build;
  gV[level].build = function(...args) {
    const map = buildAbbey.apply(this,args);
    const vault=map.cmap[68][46];
    for (const [z,left,right,h] of courtRows) {
      for (let x=left;x<=right;x++) {
        if (map.g[z][x]==="#") map.g[z][x]=".";
        map.hmap[z][x]=h;
        map.cmap[z][x]=vault;
      }
    }
    // The native dressing pass hung banners and glass on the old south wall
    // of the nave. That span is now a walkable doorway.
    map.decor=map.decor.filter(d=>!(d.z===57&&d.x>=45&&d.x<49&&
      (d.k==="banner"||d.k==="glass"||d.k==="sconce"||d.k==="bench")));
    return map;
  };

  const finishes = {
    stone:[128,110,84], shade:[65,59,50], limestone:[169,145,106], mortar:[49,47,43],
    iron:[56,61,56], bronze:[115,78,45], verdigris:[65,111,102], gold:[179,131,68],
    darkWater:[36,67,64], water:[83,132,120], foam:[153,184,155], soot:[109,98,81],
    red:[99,75,48], ochre:[128,98,61], ember:[249,161,69], flame:[255,224,149]
  };
  const finishNames=Object.keys(finishes), bankSize=32, atlasSize=bankSize*4;
  const samples=/* LAVABO_MATERIALS_START */ {"stone":"iZ6TdoFtY1Vwf3KShn2WlYFsn01gY7R1ep5/iYaCc1Fue2t3e3Gkk4p3oF1pY6mSZI52hn2FfluDinZ1amGMfIN6tllhbK2Vcn2BdWeIcluVi5eQbmd2bm9+n2NnaaKMjJmceWxyZFqWgpyVf32Fd3d0fGtneKiTiJ+fjo5zeENwc4+AhYOehIh3gllQd5KTb5SYl5iMj013gHZueW6UeYmIlFtkYHCVcId7i42JilyLjX98Z2GCcoKXmW1zcIRyjZByhXSIhFt/kY6SfXhlaYJ9iWpgepmKj6WLlWd4bE18oYyQmYp4fnBocHRQc5mUjKGfqXJyb05vpIeFnYyKpId3j1tTcZyTnKCPqH+DhFV7im5ylXCEsJOKtFZwYnd6kJyQmH2Mg1OVkGx2e195lIqEqUl9b4Rif4uCjn6GiVaNi4aTh2hnc5iDqUp3hpKSln13dXh6g1SKg46cn3+Af4l/tU5ohI6usZCBa21yekhzj4mWnHmemHVyxWNUfIaol6Wal3d7fGtsh3KFmH2UlnuAgHhUZ26cenWMjI2Oioh3gXh8hXmSjYiNXnNec257hX1rZIeGno6WlG+Oe2yEgoiHWWdoiXaDnpN9bmZmmI+UlISaiW92e32IX3Fih4SMnJaMdmx5bnKPlIeVioJ4en1/Xm1id317mJSYf3mLXG9tdIeXj4GBln57aWlkgH6HfH+PhXKMZHh2fWhri32DsZyOZmxgdoucaIFsdHKZZ3qaiIB3Z2V1rq6ifphLZYCK","shade":"paarpafOy723rqquqLdm687l5dDYysrRqaqjpau5y8jHvbyu3rd71bvq5ePf09DRsqqqpa2mxMrH2MrB6+ur1YKWtp7fjdDPvK6wq6umvbvc5Mq16+efeWCWcJ6QZ4uEvLyws83K07up5JiDoYifYGBlbWBnZ2iEs8rPz827qbBwnWeDaohva21xbWxncXRqrMrRrN1uqZJwbHNpc2pta3FxcnF5eXR3jaWIrIBxbnN8fHNxc3VybGhranF0eXl4Z3RrbWVxdXN7fHV0c3BydWhtampsdnZ4Z2drdWVycXV1eHN0c3Buc2BxbWpscXV3amlwcXdwcXJ1dXBzc3Byc2lxbWprbXp6c2lna250cHJydXBsc3Fyb3FmbXBwbXZ6dmtna2x0c3J0cm1sbWtxcnFecG1wbG91dmlwampsbnd3cnNsb2tqanJpbWxwbW9qdVxwcGpsbnFzd3Rzc21oamlpZWxubW9tc2RxcHFxamtzdHR2c3JoaWxyXnNyb3RucWRhcG9xcHNucHFvc3VwcGxrXmdya3R2anJibW5yc3N1cGpvb3VwcHBrXlhlXGpkam5ibW50bHFxdnBkYGlibGViWlhYXFhkbG5iY29pbGFxb3BuYGFiZ2VkWmhsWWlac25nX2JeYGVhX3WCc3RpeGl5ZmlscGl0bG9aX2JeaGVtX3OChHR9eH55eGl7cIN0XmNpa3ZueXp9eH19foGBgoR9emx4goWDXndpeXZ6eXl9gH18fn2BgoR+enJ4fYOD","limestone":"mp1WZ6yWpKelnq28tLm5sL27qD1GQDsip5dWZ6yxusfFta28tKqgn7a/qD1GPjokvKJPhaexusewpaSuoaqgqZWgmEI/PjokvKJPhZSjorCwpaSueH59hpWoQEJAQEMsnYhAZ5SjqoGGgn9/eH59iY9sUUVBQEM2nYg3XHB6f4SEgomEa3iFiY9seUVLUEM2eWw3XHB6iJedh4mEa3iyrbRBeUVLUDY4eYI6coCCiJedjLWagI+yrbSVQ0FCSjY4jYI6cpGVjrSyjLWagaSys7OVQ0E3QjE8lXI8fZGVjrSgeLWZgaSyrpHrHj03QjE8lXI8gnWJaqGgeLWJhYqcj5HrHkFASD5Djm07gnWMbIeVdpeJhYqTgX7rS0FGRTxEjm03hHGCbJKAdoqAe4WTgX7r6y1FQTxHiFA3hHGCa4F1fYWAe5usmZLr6y1FMSk0dkcugHiCa4GLl5uViaesmYbr6x42MSk0dkcugJSXjZOLl5uVobW0rcfr6x41MSs7gGc9k5SXjZ6eq7CqobW0mOPrdh41MStVgFpbj5eenp6eq5SDhpyamOPrizM/QTZVhXZbj5icen1wfZSDhpx3auvrizM/QTdWhWJPdn57fIBraYhka353auvrpVU/QzdWjWJPdm5qbXRVaoJhdoWJc+vrpVVAQjpaf0hAam5qbXRnhI51eYWIc+vrsG1AQjpaf0hAeXd3g4ZnhI6HkZ2rduvrsF01NzNOjVRWeXd3n52FmoeHkZ2rjOvDgys2NyxC","mortar":"cXme1+vrQD1APj9IRVpYQkddalxTaZ/rcXKl4OvrRkBJSURXT2NYQkddalxTYorrbHqf3evrPUBJSURXT2NsSEtleWdRaoPrbHqf3evrPT5JTEtmSmJpSERnemlbZ5DrbYKh5evrREBLTlN0TmhtU05nemlbZ5DraHWPxOvrQz5CRFN0TmhtU05zhnFmcpjrZGyHxOvrQz5CREJiRlZZSEptfFhadIfrZGyHuevrQERCRUBgRFFNP0ZrdEhadIfranaN3OvrQEROUEx4RFFNP0ZrdEhVan/rcH6X6+vrQEROUEx4UW5kT058gFJSaJnrcH6X6+vrSkRRUlOJXG9vUk9/jFlYdpjrZW+M3+vrQEJITEx6UG1fUk9/jFlYdpjrYGR80evrPkFITEx6UG1fS0Vuc1FZcp7rZml80evrPkFGTlFuUmJZREZkZ0pOZH7rZmmAz+vrNDtHT1N0UWpnSVFzd0pOZH7rdnWS6+vrQTxNVmCKUWpnSVFzd09MYHrrcnSK6OvrQTxNVmCKXHx6TE9weVJUdJbrcnSK6OvrOj5IUlh9UXBvQ0FkZEpUbJbrcn6X6+vrPj5CT1l6WXRpQ0FkZEpUbInrbH6V3uvrNzZCT1l6WXRpREVmaU5fbpXrcn6V3uvrNzZFSlqFYXBaQ0ZmYUhfa5DrcnV/zevrPzpEUFZuUVxfRkloYUhfa5Dra2x+xuvhOz5BUVFuUVxfRkloZENjeIXrbmuLxuvhOz5BUVFtWFRVQ0VeYEFeb4PT","bronze":"4sFYW2RxYGlUcKV+iamhe1FdZFdcg5B1185jbWhbaWRsdoJqpnlZW1yVnV9WUXmX6+t5dXxhr5R2f3KZalxbX6rJrK9uWlpF6+txcoJbk4Nurq5nYlSP2tiIe8Cva15d6et5WnZmbGeSrn1YXHHGtmFXV014rG5f6+uDXXp0faCKW1thVKDFcU5XW1hOepFd6uuBXXFhp4BfXVlZmbJ2SVZYWVpKa6Jv6+uCT21vpm1fbmRvc62KU11ZVldWWpW52uV8T2SabGBiYq6+UpejYUxYU1lNUpurpb5yTmCYakxRkb2Wh5qzuYBZcF1chqaY6+t6SmKTYV6KtapkV1lxtLFsbWl+oIF76+uCSGSSkIFlSmSSV216ZpSmZKKPbGpr5NV7S2GSb0pPUVFeeVlufGJvrnBsiXVT1eqLT2OYaE1faFVRjXJ0jHBXk152hmVT6+uXSWWZcFhmeXJuZox4bHFwzW9fboWV6+uPSmWYalRdZWB4lJJ+YG131X1olJ51z9iEUGmYeH+EamSJnH15Zm99zYlwjXpg4eeOVmOXgmZpkZBXqIBkaGBlw4hobmV13OONVGSYdlJXaoqVpXNbWWRkwo1kcGxm6euNVmmdgGRjYI/RdFpbXGVnt5BlaWBd4OaVWWuZeJOgfF5fbWhnYV9ttZllZWBc1+iQWmiOcX6NbUxVdXBbWWpws5pcZGVc1eCIVmWFb26Sg15egLNvYH52noZVXGh46+uFV1JxaWheb5OKcXJfY3Vwh31cYXKL","verdigris":"goiVh4SFiXKFiYCIm5K1xZmhnqOHj5+Na3iVh4SKkXWFiYCRjJW1xZmdnaKHj5+Ia3iGkZuKkXWDhIaRjJWyvpWdnaKKiZOIW1iGkZuMiXiDhIaclauyvpWVoJKKiZOPW1iGc5eMiXiPkI2clauzt4SVoJKcnp+PdWJqc5eMhnqPkI2kkayzt4SXn5Gcnp+kdWJqXmVxhnqPjJ6kkay3wIKXn5Gft5OkfG1zXmVxY2aQjJ6njbC3wIKbl56ft5OIfG1zaW5QY2aQf62njbC2vpKbl56Mj3mIfGR5aW5QVFNpf62nhrS2vpKLfo+Mj3lacmR5aZhYVFNpWoGMhrS2lo6Lfo9bU1pacm50ZphYVGNZWoGMfp2flo5dVlxbU1pnfml0ZpRhYGNZZGFjfp2fXWVdVlxqa2xnfmlxYJRhYHRoZGFjaGFfXWVgYGVqa2x2kmpxYHNcYXRoZGxsaGFfZGJgYGV7dHl2kmp2c3Ncb3lxeWxsbmdoZGJgc3l7dHl7joJ2c3NeaHpxeXGDbmdod3Zqc3mBdXl7joJxdYVeaHp0fXGDbnOSd3ZqfnqBdXmBYpNxdYVmb3N0fXCKfHOSdoVofnp9fX6BYpNxd5Fmb3Nvc3CKfGygdoVodoB9fX59YpR6d5Fncntvc2+WeWyghYRedoCEgop9WJR6kJJncntze2+WeWydhYRegXuEgoqJWGx0kJJncYNze2+AfGydhn1kgXuJiI6JZGx0kKh3cYNweHGAfG6Ihn1kj4eJiI6e","gold":"WWp8rx4eHh4iMR4ePIFyeHdzIyxBSE88auvepy4jN0RPilAhmevr6+vrdjlNU1VaNsBRHiEeKC0wW0MiU3+bn6ndezJNYWxZL00gNUNET09ZlamwdHR6e4eVTiZKRkJjVl5YX2111Nvr6+vr6+vr6+vrXyE4Ix5bOlAzM0FKaKWpzszr3+vr6+vreC00LyxhN1A3MztKaEtMb3flQJtfbpTDfTE3QEFgHh40HiMoNEtMb3flQJtfbpTDfTI4Pz9qLCBXIicvPGBnjJbkVMloj4vrdTI4Pz9qMh5uNTIoSnB3lJ3LetXG68vrSS80NT1vJiJeUjgwWHZwlJfV3uvj6+vrQis3O0BtIiVSSyoxUml7j5XcuI9sdanrRSwxOzpfIiVSSyowXWFreIB7bGhjU1LrYSQxTFRpLTBbViowXWFreIBzsmm50nbrqSMkOUNWIipcTy8jW1hedIFzsmm5uXaq6860VEIwH1aAPzQrZmhnhpaF62nOnKFs6860VNV3LH1/LzkwPHFrkKeM2sLgv5WP6+vr69V3Ij01Hh4eJ0w+VnReatB2mlZna4Z4aoagIj01Z3JodIV1dnx3iZZbeXFwal5iSjU3YVxmZ3JodOvr6+vr6+vr6+vr6+vr6+uI6+vr6+vr6+vr6+vropq7wOTr4ujr69V2r6rFnaekq6KfpZ6mopq7wEnripWtsnp2V0xaTV5UZGReYV5WXTJbUknriszb0KubbF5mXm9QaWtUUmpUWz9temrrrczb0JGK","panel":"bGSanOV0cmZZhG5dWpxtSlNXSoxZXDxyhXKdvOt/dnB5nFdgWLRSU1NVRp5rXlFNcnWQrOZ8bF2je1lUZ65FUk9OToGEZmxPfG+Es9uDWmuiaGlqZqhPWVBTUpG1VF5ieW6Uq9V4S5ZoW166iK2EU1hfU6CUTVNaaWiLjqBuSpRmSI2ScZa1fGdYWKGPg66EenOQtut1Ro9dWrFgRFSwrVxlen2bfJzDenuSt+t+RI2MfEaNdGlikF2di2ZtbFWbbXCFrt93R45rRk1ae1V4XqdsZ3BZlmFjcnOfm9GHS5RkSGNNbW6Ia4ZacmF4mGBef3igoNSMR5VlUGpaUYJzcJdhaFSVb2Bcg4GZoOuLRpNmUGFzmY5babZ5W4F1XWZbe3SDf8qATJR0e2aFr3lia6KFbHZmfFpdbmuep82BT5KEkZhrf2xsYJ5+ZF11b2lWf3ubndiIUJRyYY1TbntkXJWEY2F7dYxfi3qaoOWJUZh7YFvNslVYYIaKXmh1g3FkiHKVpNyOU5l3d3qUeVFZV4aMYFx8e0lne2+XotiRVZVzjnhbZWRdW4KUYFxvXURTdW6VstGDUoFran9aZmxVZnaWV2Ffh3NKcHCcp+vrU4l7eo+Oaq9cenGCWGRRg5JjVltob7WrQW1lZGuGbW5ecGZ5XG6KcGBmirbr66nr62BTTkhcSDxPU1ldUFFcUU1Pgarr4bHr6+vr6+vr6+vn6+vFwLm46+e6dXiKhHeplJaZppS3lZabloyJkJOH6+vd","frieze":"VFhWYkpUU1dWV1VLVk5QTEdhWE9cU15ed2lkhlhiaGVmaWt1b2pnUl1gdF2NUWNnhmtvbWZsbHFmbG99h3t/W3dyfXGTamxweWtxX352c3B7f3R3e3Z1Y3WHtYqtg4KNxIuBbZSUjnWPhYiDg4mCh3JzlW3AcVBVs394eW9SX1RWWldYU2WVR1JUdVl8WV1f54iQdmROXV5sZWNza2+DbH9lmHhya29vtpyIfFxqcHFyamlycHNxjpuCooeVcnuFwpCBhl50e3hudIV3eWlyknOQoJNyen+J4oSCk11ocoJ8g3uEiG1lgHR+oX1ugWmMpoyPlVtyhIp+i46QeGRyjIKLq4WKd4NjypeAil9/hYCNbZ6NcGaAe3duhX+BdX6Ezo+Ii2mHineDe5V3j5KLc2FzlH5feJCDsZGUpI6OjYuClJNid39/g5Fwj51jeXd967GbqXSAiXh7gmpnfW6CZYB3eHdye5SQw5GRq3B+gouUn4B3h3KMdIdmeHBudZON656bs4WOkJKNk5JwgHGKhYx7koRwe4B166q+s4yJgn2BipNvhXtecZJ+e4Fse4OCoZuosJN6jIuFe3iUmYF5gop7kIZrcoZpsaWGp451fIOMfH2cgJBrk5OSfYJma2Raza+mrYZpfYpjXmR3pGhRZnGXaGhsdciv646St3WThH+FiKCckGSMqau4kai4orRluY2FqF6epXyDiYSQt5J9rpx4aGpwenN4sp59mYJ8eYJyhX17f2l0f3zKbnR0kKWn","flags":"Nk9VY2ZtaIF4XnlxbGhXX9qYwpOmfZ2WSlxiX1pgbWBhcHN0bmZynJ+njJRPtpmnaG9ncUZ6YmFicGhxaGZu48C2lbebyLKzYWZ6XW6MdG1hXV5tT1+vtryEwkTOtLbrTltvRY5vdGdybF5ZUlrFt6iixbOvu4F/WFxaZntoYHZ3bHFbYn+LnWnHdM29mlS6cmVTWVlWY3dxdnBfX6uSfI+lkceRjobLcWtTXFtiYGZyeWBsto2ftY5TraqQW8bTZmRqY2FeZ2NfV2xqyIOftrpSkYqhSru/b05KZ3Fpal9hUmvjpIydm2KPq4eLeIK7ZjpNZGxwc2ZmXVqpgZGnfEeejK1Gcmx0WkdUYGtdd3JwaOt6YZyRSl+bjbOmdkxgXlZbWlxZY2FqbM+RVYVISHB+vnOSX2OMV1tdZGdOXmBo6aOwgXM1dm5p2lRYY+vrSWJPY2NRZGtkrZGJlEVLboShTFSTTevrUWRVUmNvbWbMkp56g0lgb3roSHqEjYngWmJLV19ta2CkeX6EPmGBcmddSXWHkEN9SEpaUGReas2DhEuGTmZxantFXE58i1eiMztLV1lYXKaWhG5IVlZvT1/ZZGdOSOujVC5SVltc16B+Y3M1RkqUr9Dr61lMSI+xVEkwOFNWj2NxSn/Xwn3rtYvr68w+L2mwRTo2LDW9QYaGeOvr64LO65vr68CcL0d4jIxELS1CVc3rYMTopbDp6+Hr6+uaWVBKwLtzR0IzT0eyZMOxs6Dr6+vr6+vrbGh5","sky":"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owijCIMIgwijCEYhJRkkIUQphEEFWo3lhmpCAOQQowjECMQIowiDCIIIYghiCGIIYgCCCIIIggDECEcRyRkLGuoZqhHqGeoRCxqkCKQIxAjECKQIowhiAKMIxAikCKQIpAjECKMIgwhnIcMQBCHGSaVBJ1qHYsMIxAiDCIMIpAjEEMMQwxDDCKMIgghiCGIIZxnKGSsqqSEmEeQIowijCCQxwyBFMcZBZDlEOcMgYgijEMMQoxAEGUUhgwiDCIMIowiDCIMIgwiDCIMIgwiCCIIIgwiDCIMIgghiCGIIQgCDCIMIYwCDCKMIZyElISQhJCmlQcVRSrQFUmMA5BDDCOQQxAjECKMIowiDCGIIgwiCCIIIgwiDCMQI5AgGCSYRRxHKGcoZCxpLIsQIxAjkCMQIxAjDCKMIpAjECKQIxAikCMQIowiDCGchwxAkIeZRJ1qoashqgwjDCKMIgwijCMQIwwjDCKMIowijCKMIgwiDCIQIaBkmEYMIpAijCIMIhEEkKUUppkGFOYRBAyGCCMMQoxDkEGUppimjCKMIowjECMMIowijCMQIowijCKMIowikCKQIowjECKMIowiDCGIIYgCDCKMIowiHKUUhZSmlOSZSBlpmcgQxpADkEMMIwwjECMQIxAjkCMMIowjECKMIggijCMQI5BDkCMQI5BAFCSsiyhmpEeoZBQkFCeUI5QjkCOQIxAjECMQIxAjECMQI5AijCKQIqCnjEEQpaGLpaip7KXODCMQQwxCDCKMIxBCjCKMIgwijCMQQxBCkCKMIowhHGUYZ5BDlEAURxBDlSUQxhTGFOUQxxUGEMWIIwxDkEMQQ5BjjGGIIgwiDCIIIgwijCKMIgwiDCKMIgwijCKMIowijCKMIgwijCKMIgwiDCIMIowijEIchJRllKWQxxUmHakiDJCGDCMQIgwiDCKMIxAjDCKQIgwiDCKQIowiDCKMIxAjECMQIxAjECOQICyImEcQIxAgFCcUI5QjECMQIxAijCKQIxAijCKMIpAikCIMIowiHIQQZJCEHWgdaqGqIasMIwxCjCIIIowiCCGIAYgCjCKMIgwiDCKQI5BDECGgZBRHECMQQowijCKVBJClEMaVBZDmlQcVJggijCMMQoxCjEKMQYghCAGIIYgiDCIMIgwiDCIMIgwiDCIMIowiDCIMIgwiDCIMIYwiCCIMIowijCKMIhyElIUUphTHlSQZap2rjGIMIowijCIMIgwikCKQIowhiCEIIgwhiCGIIYgiCCKMIowjDCMMIwwhnEeUIxAgFEeUIxAjECMQIowiDCIMIowijCIMIowiDCKQIgwijCIch5BAkISZaZ2KoaodqgwjDCIIIggiDCIIIQQBiCKMIggiCCIMIgwikCOQIRxnkEMQIxBDECKQI5npFYmZix3IlWoRJZ7MlamIIxBDDEMMQ5BAkGYIAggiDCIMIowiDCIMIggiDCKMIowijCIMIYgjECMQI5BDEEKMIowijCMQIowhmIWYphSmFMeZJZ1qHYsMQxAjECKMIwwjECMMIowijCIMIgwijCKMIowijCKMIxAjECKQIxAjECOUIBRHkCOUI5QjECMQIxAiDCIMIgwiDCKQIowijCKQIpAiDCIMIyCnjEAMhxUnlSQZaR1qjCMMIowiCCIMIowiDCKMIowijCMQIxAijCMQIBRFGGQUR5BDkEMQI5AhnkyRixUlGYgVa5FHmmsRZghDEEMQQwxDEEMQQgwijCIMIgwiDCIMIYgiCCGIIYgiDCIMIYwiDCKMIxAjECKQIpAikCKMIxBCCCMQQwxDkEMMQ4xhEKYVBIQCjCOQIwwjDCMQIowiDCKMIowijCKMIowijCKMIowijCKMIxAjkCAUR5QjkCOQIxAjlCMQIxAjECKMIpAikCKQIpAikCMQIpAjECKMIgwinKeQQBCEGUodiqGrIaqMIowhiCIIIgwijCIMIgwijCKMIgwiDCIMIowiDCMQI5BDECKMIowiDCEVqxGFDOWQ5hEHkUQMxghijEMMQpBDEEMMQgwiDCIMIgwhiCGIAYgBjCIMIgwhiCIMIgwiDCIMIowiDCKMIgwiDCKMIpAikEGII5BjDEEQhJCGFMYU5Z1oDIYIIowijCIIIgwhiAGIIgwiDCIMIgwiDCKMIgwijCKMIgwgFEUYRJhHkCMQIxAjkCAUR5RDlEOQIxAjECMQIpAijCKQIpAikCKQIgwgiAOQYwxDjGEU55kkGUiZaYgBiAIIIYgCjCKMIowiDCKQIowiDCIMIgwijCKMI5RAFEeQQxBCkCKMIAjFlcgaLQ0EEYui7YhDEGMMYoxDEEMMQowijCKMIowiDCIMIgwijCIMIowijCIMIowiDCIMIowijCKMIowijCKMIowijCKMIySEFGUQpRSkkKSQp4yDFQQl7hTlBCIMIgwiDCKMIgwijCKMIYghiAGIIowijCKMIowijCOUQxAijCKQIxAjECMQIpAijCKMIgwiDCIMIgwCjCMQIpAjECKQIgwjkEM1CBBnjGAMh5kknUgZSBkpiAIIIowiDCKMIxAjECMQQxBCjCKMIowijCMQI5BAFEQUR5RDkEMQQxBAjMSM5IzkjOcaCiNxiEOQYwxijEKMQoxCjCIMIowiDCIMIgwCDCIMIgwiDCIMIgwijCIMIgwiDCIMIowijCIMIowiDCEEAxBCHIWIIBBkEIWUx5kGFOYU5hDnjKEQ5QgCDCIMIgwiDCKMIpAiDCIMIowjECMQIxAikCKQIBRHkCMQIxAjECMQIxAjECMQI5BDECKMIpAjECMQI5BDECMQIxBBBCMQQSjLEEOMY4yDFSQdSZ1rpciEAIQBiCIMIowijCMQIxAijCKMIpAijCKMIowijCAURJhnkEMQQxBCkCA=="} /* LAVABO_MATERIALS_END */;
  // A tiled, pixel-scale surface. Each face gets its own directional light
  // and corner variation so the cornices still read at the native resolution.
  function surfaces(){
    const texture=Z(e0(ctx=>{
      const pixels=ctx.createImageData(atlasSize,atlasSize);
      for(const [slot,name] of finishNames.entries()){
        const base=finishes[name],stone=slot<4, metal=slot>=4&&slot<=7;
        const key={red:"panel",ochre:"frieze",soot:"flags"}[name]||name;
        const sample=samples[key]&&atob(samples[key]);
        for(let y=0;y<bankSize;y++)for(let x=0;x<bankSize;x++){
          const u=Math.max(1,Math.min(bankSize-2,x)),w=Math.max(1,Math.min(bankSize-2,y));
          const hash=((u*547+w*659+slot*587+u*w*241)^(u*31+w*29))>>>0;
          const grain=(hash%31-15)*(stone?.91:.55);
          const veins=Math.sin(u*.39+Math.sin(w*.30)+slot*1.9)+Math.cos(w*.57-u*.14);
          const deposit=stone&&veins< -1.15?-12:metal&&veins>.98?16:0;
          const flow=slot>=8&&slot<=10?Math.sin(w*.74+Math.sin(u*.36)*1.05)*8:0;
          const index=(((slot>>2)*bankSize+y)*atlasSize+(slot%4)*bankSize+x)*4;
          const facet=sample?(sample.charCodeAt(Math.min(23,Math.floor(w*24/31))*24+Math.min(23,Math.floor(u*24/31)))-128):0;
          for(let c=0;c<3;c++)pixels.data[index+c]=base[c]+grain*.68+flow+facet*(slot===12||slot===13?1.21:.72)+deposit*(metal?[.4,1,.83][c]:1);
          pixels.data[index+3]=255;
        }
      }
      ctx.putImageData(pixels,0,0);
    },atlasSize,atlasSize));
    texture.name="ashLavaboSurfaces";
    texture.colorSpace=ha;texture.generateMipmaps=true;texture.minFilter=YC;
    return texture;
  }

  function masonry(){
    const positions=[],colors=[],uvs=[],index=[];
    function face(points,kind,tone=1){
      const a=points[0],b=points[1],c=points[2];
      const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2];
      const vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
      const n=Math.hypot(nx,ny,nz)||1;
      const light=tone*(.61+.22*Math.max(0,nx/n)+.24*Math.max(0,ny/n)+.23*Math.max(0,nz/n));
      const slot=finishNames.indexOf(kind), start=positions.length/3;
      const square=[[0,0],[1,0],[1,1],[0,1]];
      for(let i=0;i<points.length;i++){
        positions.push(...points[i]);
        const [u,v]=square[i];
        uvs.push(((slot%4)*bankSize+1.5+u*(bankSize-3))/atlasSize,
          1-((slot>>2)*bankSize+1.5+(1-v)*(bankSize-3))/atlasSize);
        const value=light*(i<2?.94:1);
        colors.push(value,value*.985,value*.95);
      }
      index.push(start,start+1,start+2);
      if(points.length===4)index.push(start,start+2,start+3);
    }
    function box(x,y,z,w,h,d,kind,tone=1){
      const x0=x-w/2,x1=x+w/2,z0=z-d/2,z1=z+d/2,b=y-h/2,t=y+h/2;
      face([[x0,b,z1],[x1,b,z1],[x1,t,z1],[x0,t,z1]],kind,tone);
      face([[x1,b,z0],[x0,b,z0],[x0,t,z0],[x1,t,z0]],kind,tone);
      face([[x1,b,z1],[x1,b,z0],[x1,t,z0],[x1,t,z1]],kind,tone);
      face([[x0,b,z0],[x0,b,z1],[x0,t,z1],[x0,t,z0]],kind,tone);
      face([[x0,t,z1],[x1,t,z1],[x1,t,z0],[x0,t,z0]],kind,tone);
      face([[x0,b,z0],[x1,b,z0],[x1,b,z1],[x0,b,z1]],kind,tone*.78);
    }
    function band(x,z,y0,r0,y1,r1,kind,tone=1,sides=12,angle=Math.PI/8){
      const pt=(i,r,y)=>[x+r*Math.sin(angle-2*Math.PI*i/sides),y,z+r*Math.cos(angle-2*Math.PI*i/sides)];
      for(let i=0;i<sides;i++){
        face([pt(i+1,r0,y0),pt(i,r0,y0),pt(i,r1,y1),pt(i+1,r1,y1)],kind,
          tone*(.98+.035*Math.cos(i*11+angle)));
      }
    }
    function disc(x,z,y,r,kind,tone=1,sides=16,angle=Math.PI/8){
      for(let i=0;i<sides;i++){
        const a=angle+i*Math.PI*2/sides,b=angle+(i+1)*Math.PI*2/sides;
        face([[x,y,z],[x+r*Math.sin(a),y,z+r*Math.cos(a)],[x+r*Math.sin(b),y,z+r*Math.cos(b)]],kind,tone);
      }
    }
    function pipe(a,b,r0,r1,kind,tone=1,sides=7){
      const dir=new Y(...b).sub(new Y(...a)).normalize();
      const right=new Y(0,0,1).cross(dir);
      if(right.lengthSq()<.001)right.set(1,0,0);else right.normalize();
      const up=dir.clone().cross(right);
      function rim(at,r,i){
        const t=Math.PI*2*i/sides,u=r*Math.cos(t),v=r*Math.sin(t);
        return [at[0]+u*right.x+v*up.x,at[1]+u*right.y+v*up.y,at[2]+u*right.z+v*up.z];
      }
      for(let i=0;i<sides;i++)face([rim(a,r0,i),rim(a,r0,i+1),rim(b,r1,i+1),rim(b,r1,i)],kind,tone);
    }
    function finish(){
      const geometry=Z(new h0());
      geometry.setAttribute("position",new y0(new Float32Array(positions),3));
      geometry.setAttribute("uv",new y0(new Float32Array(uvs),2));
      geometry.setAttribute("color",new y0(new Float32Array(colors),3));
      geometry.setIndex(index);geometry.computeBoundingSphere();
      const material=Z(new $e({map:surfaces(),vertexColors:true,side:hi,toneMapped:false}));
      const object=new pt(geometry,material);object.name="ashCloisterLavabo";
      return object;
    }
    return {face,box,band,disc,pipe,finish};
  }

  // Native collision is indexed per map tile. The bowl footprint is clipped
  // to the octagon with strips and the narrow shaft gets its own height.
  function mass(x0,x1,z0,z1,height){
    const body={x0,x1,z0,z1,y1:height};
    for(let z=Math.floor(z0/P);z<=Math.floor(z1/P);z++)
      for(let x=Math.floor(x0/P);x<=Math.floor(x1/P);x++){
        const key=jM(x,z),parts=v.masses.get(key);
        if(parts)parts.push(body);else v.masses.set(key,[body]);
      }
  }
  const basinX=91.25,basinZ=130.90;
  function laver(m){
    const x=basinX,z=basinZ,f=ie(x,z);
    const profile=[
      [0,1.69,"shade"],[.07,1.69,"stone"],[.15,1.58,"limestone"],[.21,1.57,"shade"],
      [.23,1.32,"stone"],[.30,1.33,"limestone"],[.40,1.41,"stone"],[.46,1.48,"bronze"],
      [.92,1.52,"ochre"],[.96,1.56,"verdigris"],[1.04,1.65,"limestone"],[1.09,1.62,"limestone"],
      [1.09,1.42,"shade"],[.99,1.28,"verdigris"]
    ];
    function turned(points,count,angle){
      for(let n=1;n<points.length;n++){
        const [y0,r0]=points[n-1],[y1,r1,kind]=points[n];
        m.band(x,z,f+y0,r0,f+y1,r1,kind,1.1,count,angle);
      }
    }
    turned(profile,8,Math.PI/8);
    m.disc(x,z,f+1.035,1.36,"darkWater",1.2,8);
    turned([[1.03,.63],[1.11,.68,"gold"],[1.21,.57,"bronze"],[1.33,.52,"verdigris"],
      [1.76,.52,"red"],[1.80,.60,"gold"],[1.83,.62,"verdigris"],[1.95,.73,"bronze"],
      [2.03,.74,"gold"],[2.06,.63,"verdigris"],[1.99,.50,"bronze"]],12,Math.PI/8);
    m.disc(x,z,f+2.017,.555,"water",1.17,12);
    turned([[2.02,.19],[2.13,.22,"bronze"],[2.19,.29,"gold"],[2.26,.17,"verdigris"],
      [2.34,.14,"bronze"]],8,Math.PI/8);
    const cy=f+2.63,orb=.32;
    for(let i=0;i<6;i++){
      const a=Math.PI*i/6;
      for(let j=0;j<12;j++){
        const point=n=>{
          const t=n*Math.PI/6;
          return [x+orb*Math.cos(t)*Math.cos(a),cy+orb*Math.sin(t),z+orb*Math.cos(t)*Math.sin(a)];
        };
        m.pipe(point(j),point(j+1),.031,.031,i%2?"bronze":"gold",1.25,5);
      }
    }
    m.band(x,z,cy-.033,orb*1.035,cy+.033,orb*1.035,"gold",1.30,12);
    m.pipe([x,cy+orb-.045,z],[x,cy+orb+.34,z],.048,.028,"gold",1.40,7);
    m.pipe([x-.17,cy+orb+.21,z],[x+.17,cy+orb+.21,z],.032,.032,"gold",1.40,7);
    for(let i=0;i<8;i++){
      const a=(i+.5)*Math.PI/4,dx=Math.sin(a),dz=Math.cos(a);
      const at=(r,y)=>[x+dx*r,f+y,z+dz*r];
      // Ribbed metal leaves hold the lip of each stone basin segment.
      m.pipe(at(1.39,.40),at(1.50,.92),.067,.060,"bronze",1.14);
      m.pipe(at(1.47,.89),at(1.54,1.03),.072,.034,"gold",1.05);
      if(i%2===0){
        m.pipe(at(.53,2.003),at(.77,2.055),.083,.060,"verdigris",1.17);
        m.pipe(at(.76,2.04),at(.87,1.96),.036,.026,"foam",1.21,5);
        m.pipe(at(.87,1.96),at(.98,1.72),.026,.031,"water",1.28,5);
        m.pipe(at(.98,1.72),at(1.07,1.055),.032,.044,"foam",1.06,5);
        const px=x+dx*1.07,pz=z+dz*1.07;
        m.band(px,pz,f+1.038,.085,f+1.044,.15,"foam",.94,10);
        m.band(px,pz,f+1.037,.19,f+1.040,.225,"water",.99,10);
      }
    }
    const edge=1.52;
    for(const [lo,hi,half] of [[-edge,-1.15,.83],[-1.15,-.77,1.24],[-.77,.77,edge],[.77,1.15,1.24],[1.15,edge,.83]])
      mass(x-half,x+half,z+lo,z+hi,1.09);
    mass(x-.48,x+.48,z-.48,z+.48,2.03);
    mass(x-.24,x+.24,z-.24,z+.24,2.88);
    mass(x-.045,x+.045,z-.045,z+.045,3.29);
  }

  // Each stone in the gate has a face, soffit, outside and chipped front
  // bevel. The ochre inner order reads as a continuous rib from a distance.
  function arch(m,left,right,z,spring,rise,thickness,depth){
    const mid=(left+right)/2,rx=(right-left)/2,count=15;
    const point=(t,extra,d)=>{
      const a=Math.PI*t,s=Math.sin(a);
      return [mid-(rx+extra)*Math.cos(a),spring+(rise+extra)*s+.17*rise*(1-Math.abs(2*t-1))*s,z+d];
    };
    for(let i=0;i<count;i++){
      const t=(i+.016)/count,u=(i+.984)/count,keystone=i===(count-1)/2;
      const out=thickness*(keystone?1.25:1),face=depth+(keystone?.08:0);
      const front=[point(t,0,face),point(u,0,face),point(u,out,face),point(t,out,face)];
      m.face(front,keystone?"limestone":i%4===2?"shade":"stone",1.02+.12*Math.cos(i*11));
      m.face([point(t,0,-depth),point(t,0,face),point(u,0,face),point(u,0,-depth)],"shade",.85);
      m.face([point(t,out,face),point(u,out,face),point(u,out,-depth),point(t,out,-depth)],"stone",1.01);
      m.face([point(u,0,-depth),point(t,0,-depth),point(t,out,-depth),point(u,out,-depth)],"stone",.95);
      m.face([point(t,0,face+.009),point(u,0,face+.009),point(u,.066,face+.012),point(t,.066,face+.012)],"limestone",1.12);
    }
  }
  function pier(m,x,z,f,top,w=.70){
    const base=f+.30;
    m.box(x,f+.095,z,w+.23,.19,w+.20,"shade");m.box(x,f+.25,z,w+.13,.12,w+.11,"limestone");
    const n=5,h=(top-base-.28)/n;
    for(let i=0;i<n;i++)m.box(x,base+(i+.5)*h,z,w,h-.012,w*.94,i===2?"shade":"stone",1.0+.055*Math.sin(i*9+x));
    for(const dx of [-w*.34,w*.34])m.band(x+dx,z+w*.44,base,.076,top-.21,.075,"limestone",.99,7);
    m.box(x,top-.205,z,w+.12,.15,w+.14,"shade");m.box(x,top-.082,z,w+.27,.12,w+.25,"limestone",1.14);
    mass(x-w/2,x+w/2,z-w/2,z+w/2,top-f);
  }
  function lantern(m,x,z,f){
    m.band(x,z,f,.31,f+.15,.29,"stone",1.05,8);
    m.band(x,z,f+.15,.19,f+.40,.14,"iron",1.06,8);
    m.band(x,z,f+.40,.18,f+.50,.26,"gold",1.17,8);
    m.band(x,z,f+.50,.17,f+.93,.13,"ember",1.6,8);
    m.band(x,z,f+.49,.10,f+.81,.075,"flame",1.6,7);
    for(const [dx,dz] of [[-.13,-.13],[-.13,.13],[.13,-.13],[.13,.13]])
      m.pipe([x+dx,f+.49,z+dz],[x+dx*.85,f+.96,z+dz*.85],.023,.023,"iron",1.06,5);
    m.band(x,z,f+.94,.23,f+1.08,.13,"bronze",1.08,8);
    m.band(x,z,f+1.08,.13,f+1.19,.018,"gold",1.15,8);
  }
  function threshold(m){
    const z=135.83,f=1.2,spring=3.15;
    for(const x of [88.44,97.62]){
      pier(m,x,z,f,spring,.75);
      m.box(x,f+.37,z+.49,.91,.53,.64,"shade",1.02);
      m.box(x,f+.64,z+.51,1.01,.11,.74,"limestone",1.14);
      lantern(m,x,z+.53,f+.71);
      mass(x-.45,x+.45,z+.16,z+.81,.70);
    }
    arch(m,88.44,97.62,z,spring,1.59,.42,.35);
    // Broken masonry shoulders carry the arch into the actual enclosure.
    // Leave a ragged crown so the dark sky stays visible above the wash yard.
    const left=88.44,right=97.62,mid=(left+right)/2,half=(right-left)/2,stones=16;
    const edge=x=>{
      const c=Math.max(-1,Math.min(1,(mid-x)/(half+.39))),t=Math.acos(c)/Math.PI;
      return spring+(1.59+.38)*Math.sin(Math.PI*t)+.27*(1-Math.abs(2*t-1))*Math.sin(Math.PI*t);
    };
    for(let i=0;i<stones;i++){
      const x0=left-.39+i*(right-left+.78)/stones+.006,x1=left-.39+(i+1)*(right-left+.78)/stones-.006;
      const base0=edge(x0)-.035,base1=edge(x1)-.035;
      const top=5.44+(i>=4&&i<=11?.18:0)+(i%5===2?.075:0);
      const front=z+.26,back=z-.24,shade=.83+.13*((i*5)%8)/7;
      m.face([[x0,base0,front],[x1,base1,front],[x1,top,front],[x0,top,front]],"stone",shade);
      m.face([[x1,base1,back],[x0,base0,back],[x0,top,back],[x1,top,back]],"shade",shade);
      m.box((x0+x1)/2,top+.030,z,x1-x0,.075,.63,"limestone",shade);
    }
    const nr=115.86,top=3.95;
    for(const x of [90.37,97.65])pier(m,x,nr,ie(x,nr),top,.56);
    arch(m,90.37,97.65,nr,top,.95,.32,.29);
  }
  function pavement(m){
    // Bed the stones separately on each tread. Their long joints stagger
    // through the level court and the north run follows the physical steps.
    for(const [row,left,right,h] of courtRows){
      for(let course=0;course<3;course++){
        const z=row*P+(course+.5)*P/3,offset=(course+row)%2*.63;
        for(let x=left*P-offset;x<(right+1)*P;x+=1.26){
          const x0=Math.max(left*P,x)+.017,x1=Math.min((right+1)*P,x+1.26)-.017;
          if(x1<=x0+.10)continue;
          const center=(x0+x1)/2,hash=Math.abs(Math.sin(center*32.1+z*63.59));
          const lamps=[[88.44,136.36],[97.62,136.36],[90.42,120.88],[87.16,124.35]];
          const glow=Math.max(...lamps.map(([lx,lz])=>Math.exp(-((lx-center)**2+(lz-z)**2)/5.0)));
          const near=Math.exp(-((center-basinX)**2+(z-basinZ)**2)/17);
          const paver=hash<.44?"soot":"stone";
          const brightness=.54+.24*hash+.40*glow+.16*near+(row<64?.10:0);
          const far=z-P/6+.012,close=z+P/6-.012,y=h+.076;
          m.face([[x0+.028,y,close],[x1,y,close-.009],[x1-.019,y,far],[x0,y,far+.008]],paver,brightness);
          if(row>=60&&row<=64&&course===0&&x0>=90&&hash>.22){
            m.face([[x0+.07,y+.004,far+.10],[x1-.10,y+.004,far+.10],
               [x1-.085,y+.004,far+.018],[x0+.091,y+.004,far+.018]],"limestone",.89+.14*hash);
          }
        }
      }
    }
    for(let row=61;row<=64;row++){
      const z=row*2,y=ie(94,z-.04)+.076;
      for(let j=0;j<8;j++){
        const x=90.5+j*.92;
        m.box(x,y-.050,z+.009,.904,.10,.094,j%4===0?"stone":"limestone",.86+.05*(j%3));
      }
    }
    // Narrow drains spill from the wash station toward a west grating.
    const z=130.87,f=1.2;
    for(let i=0;i<7;i++){
      const x=83.13+i*.89;
      m.box(x,f+.085,z,.85,.015,.205,"shade",.78);
      m.box(x+.005,f+.096,z,.84,.009,.091,i%2?"darkWater":"water",.91);
    }
  }
  function rearArcade(m){
    const z=124.17,xs=[84.22,86.95,89.67],spring=4.98;
    for(let i=0;i<xs.length;i++){
      const x=xs[i],f=ie(x,124.21);
      pier(m,x,z,f,spring,.39);
      m.band(x,z,spring+.10,.29,spring+1.04,.19,"stone",.91,8);
      m.band(x,z,spring+1.04,.25,spring+1.57,.012,"limestone",.98,8);
      if(i===2)continue;
      const next=xs[i+1],mid=(next+x)/2;
      m.box(mid,2.22,z-.01,next-x-.35,.80,.34,"shade",1.10);
      m.box(mid,2.68,z+.01,next-x-.24,.13,.45,"limestone",1.13);
      arch(m,x,next,z,spring,.98,.23,.21);
      for(const bx of [mid-.47,mid+.47]){
        m.band(bx,z+.02,2.72,.11,2.85,.074,"limestone",.98,8);
        m.band(bx,z+.02,2.85,.074,3.36,.061,"shade",1.15,8);
        m.band(bx,z+.02,3.36,.061,3.45,.105,"limestone",1.06,8);
      }
      m.box(mid,3.49,z+.01,next-x-.24,.095,.25,"stone",1.13);
    }
    lantern(m,87.15,124.43,2.78);
  }
  function windowView(scene){
    // The arcade looks over a lower, inaccessible churchyard. The native
    // stone parapet shields the bottom of this two-bay landscape.
    if(!samples.sky)return;
    const bytes=atob(samples.sky),width=112,height=74;
    const texture=Z(e0(ctx=>{
      const im=ctx.createImageData(width,height);
      for(let i=0;i<width*height;i++){
        const n=bytes.charCodeAt(i*2)|(bytes.charCodeAt(i*2+1)<<8);
        im.data[i*4]=(n>>11)*255/31;im.data[i*4+1]=((n>>5)&63)*255/63;im.data[i*4+2]=(n&31)*255/31;
        im.data[i*4+3]=255;
      }
      ctx.putImageData(im,0,0);
    },width,height));
    texture.name="ashCloisterDistantChurchyard";texture.colorSpace=ha;
    texture.minFilter=YC;texture.generateMipmaps=true;
    const geo=Z(new h0()),pos=[],uv=[],indices=[];
    for(const mid of [85.585,88.31]){
      const start=pos.length/3;
      for(let j=0;j<=18;j++){
        const t=j/18,x=mid-1.365*Math.cos(t*Math.PI),h=4.98+Math.sin(t*Math.PI)*(.98+.16*(1-Math.abs(t*2-1)));
        for(const y of [2.65,h]){
          pos.push(x,y,124.036);uv.push((x-84.22)/5.45,(y-2.65)/3.49);
        }
        if(j)indices.push(start+j*2-2,start+j*2,start+j*2+1,start+j*2-2,start+j*2+1,start+j*2-1);
      }
    }
    geo.setAttribute("position",new y0(new Float32Array(pos),3));
    geo.setAttribute("uv",new y0(new Float32Array(uv),2));geo.setIndex(indices);geo.computeBoundingSphere();
    const material=Z(new $e({map:texture,side:hi,toneMapped:false}));
    material.color.setRGB(1.35,1.48,1.60);
    const object=new pt(geo,material);
    object.name="ashCloisterOutlook";scene.add(object);
  }
  function gallery(m){
    // The western wall is a rainwater catchment. An iron grille, limestone
    // buttresses and old covers make it recognisable from the north return.
    const f=1.20,wall=82.10;
    for(const z of [126.54,129.70,131.65]){
      const base=ie(wall+.45,z);
      m.box(wall+.34,base+.24,z,.68,.48,.89,"shade");
      m.box(wall+.27,base+1.60,z,.52,2.30,.60,"stone");
      m.box(wall+.35,base+2.82,z,.71,.18,.79,"limestone");
      m.box(wall+.23,base+3.23,z,.42,.62,.59,"stone");
    }
    const z=128.16;
    m.box(wall+.13,f+1.87,z,.18,2.27,2.55,"mortar",.78);
    m.box(wall+.28,f+.85,z,.48,.22,2.77,"stone",1.15);
    for(let i=-3;i<=3;i++){
      const p=z+i*.29,top=f+2.81-.12*Math.abs(i);
      m.pipe([wall+.24,f+.97,p],[wall+.24,top,p],.037,.039,"bronze",1.02,6);
    }
    for(const y of [1.53,2.09,2.57])m.box(wall+.27,f+y,z,.083,.069,2.3,"verdigris",1.03);
    // The north stair has a surviving open arcade on the west and a raised
    // coping on the east. Both are fully outside the central running lane.
    for(const side of [90.30,97.73]){
      for(const z of [117.0,120.9,123.9]){
      const base=ie(side,z),h=side<94?1.15:.78;
        m.box(side,base+h/2,z,.38,h,.57,"stone",1.01);
        m.box(side,base+h+.06,z,.52,.13,.69,"limestone",1.15);
        mass(side-.20,side+.20,z-.29,z+.29,h+.13);
      }
    }
    lantern(m,90.42,120.88,ie(90.42,120.88)+1.29);
  }
  const dress=FJ;
  FJ=function(scene,map){
    dress.apply(this,arguments);
    if(T.level!==level||map.script?.lever?.[0]!==57||map.g[65]?.[43]!=="." )return;
    const m=masonry();pavement(m);laver(m);threshold(m);gallery(m);rearArcade(m);
    scene.add(m.finish());windowView(scene);
  };
})();
/* ASH_CLOISTER_LAVABO_END */
