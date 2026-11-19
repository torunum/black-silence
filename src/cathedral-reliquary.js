/* CATHEDRAL_RELIQUARY_BEGIN */
(() => {
  const level = 7, column = 46, row = 24;
  const palettes = {
    stone:[84,75,66], bevel:[130,103,79], inset:[34,29,24],
    band:[48,41,32], bronze:[166,120,70], bone:[197,184,152],
    wax:[243,199,136], gold:[255,238,180]
  };
  const texels = /* CATHEDRAL_TEXELS_BEGIN */ {
    "stone": "B0oHSuZBxkHGQcZBxkHGQWQ5IykjKYU5J0oHSidKB0onSgdKxUHGQcZBxkHFQcZBhDmFOUQxZDFIUkhSB0rGQcZB5kEGSuZBxUGlOaU5pUHmSQZKJ0onSgdK5knmSQZK5kHmQeZBB0rmQeZBpTmlOWhSSFInSgdKB0oGSuZB5knGQcZBxkEHSidKJ1InUidKJ0onSsZB5kHmSQdK5kEHSidKJ0rmQcVBJ0onUuZJpTmlOeZBJ0oHSidKB0onSidK5kkGSidKR1InSidKJ0onSgdK5kkGSgdKBkrmQaU5pTlIUidK5kGlQcVBpUHmQeZB5kHmQcVBxkHmSQZKB0onSidKJ1InSidKSFJHUkhSJ0rmQeZJpUGlQQdKJ0rmQaVBxUHmQQdKB0oHSgdKB0oHSqU5xUHFQeZJxkEHSidKJ0pIUgdKB0onSuZJxkGFOcVBR1InSgdKxkHGQeZB5kkGSidKJ0oGSuZJ5kHmQcZBBkoHSidKJ0oHSidKB0onSgdKxkHmQaU5hTlIUkhSB0rGQaVB5kEnSidKR1IHSidKxkGlQcVBB0pHUkhSJ0onSidSSFIHSidKJ0rmQcZBpTmlOUhSSFInSgZKB0rmScZBxkHGQcZBpTnmQSdKJ0oHSuZJBkonSidKB0oHSgdKJ0oGSsZBxkGlQaVBJ0onUkdSSFInSuZB5kkGSuZB5kHmSUdSaFJIUidSJ1JHUidKJ0pHUkhSJ0onUkhSJ0onUuZJ5kFoUmhSSFJoUohaSFIGSgdKBkrmQeZJJ0poUmhaaFpoUmhaiVpoWmhSaFKJWolaiVonSidK5kEHSidSR1KIWsliqVpoUgdKB0oHSgdKJ0pIUmhaSFJIUkhSaFJIUmhSaFKIWohaaFJoUkhSSFLmQcZBSFJIUgdKaFJoUmhaB0rmSQZKJ1JIUgdKJ0onSkhSSFJIUolaiVqJWmhSR1JIUidS5kHmQeZBxkEGSgdK5kEnSidSB0qlQcZBxkHmQeZJJ0qJWmhSaFpHUkhSB0rmQeZJR1KJWmhaaFInSidK5kHmQalaqVqpWupi6mKpWidKB0onSidKJ1InUqlaqVrKYupiymLKYspiymKpYqlaqWKpYkhSSFJHUuZJaFJIUqliTHNMc6liJ0onSidKJ0onSmhSymLKYqliqVqpWqlaaFJoUqlaymKpWolaJ1JHUidK5kFoUmhSiVrKYspiiVonSgdKJ0onUkdSJ1InSidSSFJIUidKSFJIUkhSSFJoWohaaFInSgdK5knmQUhSJ1JIUqliyWJIUuZB5kkHSidKB0onSmhSaFJoUkhSSFJIUkdSSFJoUmhaiFpoUgdKB0rmQYU5aFJoUmhaqVqpYkhSB0oHSidKB0onSidKaFJoUolaqVqJWolaqVqpWqlaiFqJWqlaaFJIUidK5kGpWolaqVoKawtrqVpIUkhSaFpoWkhSJ1JoUmhSiVqpWqli6mLqYspiymKpYsliymJoWohaR1IHSolaqVrKYitzC2upWmhaiFpoUmhSaFqpWupi6mJMcwprC2upWspi6mIraytrK2tsc+piyWJIUkhSaFJoWolayWLKYmhSJ1JHUmhSSFInSgdKaFJoWgtr6mLqYqlaqVqJWspiymLqYgtriFqJWgZK5kGpWqla6mILa+pqiVqIWolaaFpIUkhSSFKpWola6mrKYupiqVqpWqli6mLJYspiK2vJYspiB0oGSspiymLqYspiymJoUqlaqVoLa+pi6mKJWqlaqVoLaytzS3MraytrC2sLawtrK2tMc8liymIHSgZKqVqpWsliymKpYohaaFqIWmhSSFJoUmhaqVqJWgtrC2sLa2haiFqJWqlaymKpYitrymLKYgdK5kmJWqlaqVrKYspiaFJoUkhSiVqpWqlaqVrqYupiK2vqagprK2sLaytrK2sLaytrbHMKawtrSFInSqlaqWLqYgtrK2uJWkhSSFKIWqlaqVqpWupiymJMc0xzbHNLcwtrC2uMe2xzTHNsc2xzbHOIWkhSqWLJYgprC2sLa4laiVpoWupi6mLqYmhSqVrJYmxzbHNMcytrC2sLaytrK2src4x7C2sLa4laaFI=",
    "bevel": "LaROpG6sbqxOpA2cDZwNnOyb7JvMk8yTDZwNnA2c7JstnC2kLaQtpE6kTqQNnC2cLZxOpMyTDZwtpG6kbqxOpC2kDZwNnOyb7JsNnOybq5Psmy2cDZwNnA2cLZxOpC2kLaQtpA2cLaQNnC2k7JsNnE6kTqRupG6sTqQNnA2cDZzsm+ybzJPMk+ybLaQNnOybLZwtpC2kLZxOpE6kDZwNnA2cTqQNnA2ci4uLi6uTi4uLi2qLaoMpeymDSoMpgymDaoOri4uLi4tqi6uTzJPMk6uTi4vsm4uLaotKgyl7aouLi4uLq4uLi4uLaoNKgymDSoNKgyl7KYNqi6uTaouLi4uLq5Ork8yTzJOLi+ybi4tKg2qDKYNKg2qLKYNqgymDSoNKg0qDKYMpg0qDSoNKg2qLq5OLiy2kq4vsm6uT7JsNnIuL7Jtqg0qDKYMpg0qDi4sJe0qDSoNqg0qDSoMJeymDSoMpgymDi4vMk4uLDZyrkw2czJPsm+ybi4sNnEqDSoNKg0qDKYOriymDSoNKgyl7KYMpgwl7CXspgymDSoNKg2qLSoPsm4uLzJOLi6uT7JuLi2qLKYMpewl7KYNKg6uTSoNKgymDKYMpgyl7CXsJeymDCXspg2qLi4tqg8yTaovMk4uLq5PMk6uLi4sJewl7KXtKg0qDKYPoegl76HrIcgl7CXsJe8hyyHLocgl7KYMJewl7CXsJewl7CXsJe0qDCXvoeuh66HroeshyCXspgwl76HrIcshyCXsJe+h66Hrocuh66HoJewl7CXsJe+h6CXsJe+h6KYMpe+h6CXvIcuh66HIpe+h66HoJe+h6yHIJeymDKYMpg+h6CXsJe0qDKYMJeyl7KYPoegl76HIJeyl76HLoegl7KYPIcil76HoJewl76HLocgl7KYMJeymDCXsJewl7SoMpgymDCXspgwl7KXvoeuh6CXvoegl7CXspe8hyKYMJeymDaotKg0qDKYMpgymDSoMJewl7KYNqg4uLKXtKg2qLSoNKgyl7CXtKgwl7CXspg2qL6HpKgymDSoOLiymDKYNKg0qDKXtKgyl7KYMpg0qDi4spg2qDSoNKg0qDKYPoeimDKXsJewl7SoMJe0qDKYMpg2qLSoNKgymDKYMpg0qDCXsJeymDaoOriyl7SoNqi0qDSoMpewl7SoMJewl7KYNqiwl7SoMJeymDSoMJewl7CXtKg+h66Hroeuh6CXvocimD6HIpewl76HoJe+h6p3Locuh66HLIcgl76HoJeyl7KXtKgwl7KYMJeymD6Hroegl7yHIJe+h6SoPIcgl7CXvoeuh6yHKncuh6CXvIcshyKYPoeuh66HIJewl7yHLoegl7aospg+h6KXsJeymD6HoJe8hyCXvIcshyyHLIcshyyHLIcshyyHLoeshy6Hroeuh66Hroegl7CXtKgwl7CXspgwl7CXsJeymDyHLoeshy6HLocqdyp3LIcshyyHKncgl76HLocuh6CXsJeyl7CXvoemqLSoMpgymDKYNKgymDSoMpeymDCXsJe+hyCXspe+h66HIJewl7CXvoegl7CXspg+h6CXsJewl7SoNKg0qDSoMpgymDSoNKgymDCXsJewl76Hroegl7CXvoeuh6CXsJe+h6KYPIcuh6CXsJe8hyyHIJeymD6Hrocuh66HoJewl7CXvoegl7yHLIcuhyCXvIcshy6Hrocgl7p3LIcshyCXvoeuh66Hrocuh6CXsJe+h6CXvoeuh6CXsJe8hy6HroeshyyHLoeuh66HIJe8hy6HrIcshyp3Kncuh6yHLocuh66HoJewl76HrIcshyCXvoeuhyyHLIcqdyp3LIcshyyHLIcuhyp3Loeodqp3Kncshy6HLIcuh6CXvoeuh6CXvoeuhyyHLoegl76Hqncqdyp3LIcshyp3Kncuhy6Hqnashyp2qncshyp3IJe+h6KYMJewl7CXtKgwl76HLoekqDCXvocuh6yHLIcshyyHLIcshy6HoJe8hy6HqnashyyHLIcgl7yHIpeymDCXsJeymDCXvoeuhyKYMpg+h6CXuncshy6Hrocshyp3IJewl7p3LoeqdyyHI=",
    "inset": "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",
    "band": "oRjBGOIgAiECIeIgAykjKSMpIykDKSMpRDEjKUQxRDFkMYQxRDFkMWQxhDGEMWQxZDFkMWQxRDHCIMIg4iDiIOIg4iAjKQMpIykjKSMpAykjKUMpRDFEMWQxZDFkMWQxZDFkMYU5ZDFEMWQxZDFkMcIgwRjCIAIhAiHiIAMpAykjKQMpAykjKUQxRDFEMUMpZDGEMUQxZDFkMYQxhDFkMWQxZDGEMUQxwiDiIOIg4iDiIAIhAykCISMpIykjKUQxZDFkMWQxRDFEMWQxZDGEMWQxZDGFOWQxhTlkMaU5pTniIMIgwiDiIAMp4iADKQMpIylDKQMpRDFkMWQxRDFDKWQxZDFEMWQxZDGEMaU5ZDFkMWQxxTmFOcIg4iDiIOIg4iACIQMpIykjKSMpIylEMUQxZDFkMUQxRDFkMWQxhDGFOWQxhTlkMYQxZDGlOaU54iDCIMIg4iADKQMpAykDKSMpIykDKUQxZDFkMSMpRDFkMWQxhTmFOWQxZDGFOWQxpTnFOeZBpTnCIMIg4iACIeIgAiEDKSMpIykjKSMpZDFEMWQxRDFkMYQxZDFkMYU5ZDFkMWQxhDHGQaU5xkGlOeIg4iDiIAMpIykjKSMpIylDKUQxIylEMWQxZDFkMWQxhTmFOYU5hTlkMYQxhTmEMcZB5kGlOWQxwiDCIOIgAykDKQMpIylDKSMpIykjKWQxZDFEMUQxZDGlOYQxhDGFOYU5ZDFkMYU55kHmQaU5RDHiIOIg4iADKSMpIykjKSMpQylEMUMpRDFkMWQxRDFkMYU5hTmFOYU5ZDGEMYU5pTnGQeZBpTlkMcIgwiDiIAMp4iACIQMpIykjKQMpAykjKWQxRDFEMUQxhTlkMWQxZDGlOaU5ZDFkMaU5xTmEMUQxwiDiIMIg4iADKQMpIykDKSMpIykjKSMpRDFEMWQxIylkMWQxZDGFOYU5hTmFOYQxpTmlOYU5ZDGhGKEYwiDiIOIg4iDiIAMpIykDKQIhIylkMUMpRDFEMWQxhDFkMYU5hTmFOWQxRDGFOYU5hTmFOcEYwiDCIMIg4iDiIAMp4iADKQMpAykDKUQxRDFEMUQxZDFkMWQxhTmEMYU5hDFkMWQxhDGFOaU5wiChGMEY4iDiIMIg4iACISMpAiECISMpZDFkMUMpRDFkMYQxZDGEMYU5hTlkMUQxhTmFOaU5hTnCIMIg4iDiIOIgAiEDKQMpIykjKSMpZDFkMWQxZDGEMYU5hTmEMaU5ZDFkMYQxhTmlOYU5hTmlOeIgwRjCIOIgAyniIAMpIylDKUQxIylEMYQxhTlEMWQxhTmlOWQxpTlkMYQxhTlkMYU5hTmFOYU54iDiIAMpAykDKSMpIylEMUMpRDFEMWQxZDFkMWQxZDFkMYQxZDGFOYU5ZDGFOYU5pTmEMWQxhTkCIeIgAiEjKSMpIykDKSMpRDFEMUMpZDGEMYU5RDFEMYU5hTmFOWQxZDFkMYU5hTmFOYU5ZDGEMeIg4iADKSMpAykDKSMpRDEjKUMpRDFkMWQxZDFkMWQxhTlkMWQxhDGEMWQxhTmFOYU5hDFkMYU5AykDKeIgIykjKSMpIykDKSMpIykjKUQxRDFEMUQxIylDKUQxRDEjKUMpRDFkMSMpQylEMUQxRDECIQMpAykjKQMpIykjKSMpAykjKSMpZDFEMUMpIykjKUQxIylDKSMpRDEjKUQxQylEMUQxIylDKeIg4iDCIOIgAiEDKeIg4iACIQMpAykjKSMpIylDKSMpQylEMUQxRDFkMWQxhTmFOYU5hTmFOaU5wiDiIOIgAiHiIOIgAiEDKQMp4iACISMpIykjKSMpIylEMSMpQylkMWQxhDGEMWQxhTmlOWQxhTniIOIgwiDiIOIgAiEDKeIgAiEDKQMpIykjKSMpQykjKUMpRDFEMWQxZDFkMYU5hTmFOYU5hTmlOaEYoRjCIMIg4iDCIMIg4iACIeIg4iAjKUQxIylEMUQxZDGEMWQxpTnGQcZBxkHmQQdKJ0rmQSdKwRjCIMIgwiDCIMIg4iDCIOIg4iDiIAMpIykjKUQxRDFkMWQxZDHFOaU5pTnGQQZCB0oHSuZBJ0o=",
    "bronze": "Z5uHmyaTJpOoo6ijZ5sKtM3M5Yomk2ebBpMFi2u8zcyLvMmrqKOHm4ebqKPIo6ijZ5tHm0ebZ5uHm4ijJpMFi4ijqKNnmwmszMTliiaTR5sFiwaTi7ztzGu8yKOoo4ijZ5uIo8mryKNHm0aTZ5uHm4ijZ5smkwaTqKOoo2ebCrTNzOWKJpNnmwaTJpNrvM3Ma7zJq6ijh5uHm6ijyKOoo2ebR5tnm2ebh5uIoyaTBYuHm6ijZ5vpq8zE5Yomk2ebBYsGk4u87cxrvMijqKOIo2ebiKPJq6ijZ5tGk2ebh5uIo2ebBpMGk6ijqKNnmwmszcwFiyaTZ5sGkyaTa7zNzGu8yauIo4ebh5uoo+mrqKNnm0ebZ5tnm2ebh5smkwWLh5uoo2ebCrSsxOWKJpNnmwWLBpOLvO3Ma7zIo6ijiKOIo4ijyauoo2ebJpNnm4ebCazJqyaTZ5vpq8mrCaysxGu8JpOHm2ebiKOoo4ija7ztzAq0yavpq4ebiKPpq+mriKNnm8ijyavpq+mrRpNnm+mryKMKtMzEa7wGk4ijZ5uHm4ijqKOLvA3NCazIo+mriKOHm+mrCayoo0aTqKPpq+mr6asmk2eb6avJqwmsrMRrvCaTZ5tnm4ijqKOoo2u87cwKtMmr6auHm4ij6avpq4ijR5vIowms6avpqyaTZ5vpq8ijCrTMxGu8BpOHm2ebqKOIo6iji7ztzAmsqKPpq4ijh5vpqwmsqKNnm6ij6avpq+mrJpNnm+mryavpq6zEa7wmk4ijZ5uHm6ijqKNrvO3MCrTIo+mrh5uIo+mrCrSIo0ebqKPpq+mr6asmk2ebyavIowq0rMSLvAaTh5tnm4ijh5uIo4u87cwJrKij6auIo6ijyasJrKijZ5uoo+mrqKOIowWLyKPpq+mrzMSsxKijiKOoowWLh5vpq0ebh5usxKzECawqtMijh5uIoyq06avJq8ij6auIo4ebBpPJqwmsyausxMzEqKOHm6ijBpOIo+mrRpOIo8zEzMTpqwq0yauIo4ebCrQJrOmrqKPJq6ijiKMmk8ij6avpq6zErMSoo4ijqKMFi4eb6atHm6ijrMSsxAmsKrSoo4ebiKMqtOmryavIo+mrqKOHmwaTyasJrMmrrMTMxKijZ5uoowaTiKMJrCaTiKPMxMzE6asKtMijiKOHmwq0Cazpq8mryauoo4ijJpPIo+mr6ausxKzEiKOHm6ijJpOHm+mrR5uoo6zErMQJrCq0qKOHm4ijKrQKtMijyKPpqyaTBpMmkwq0yasJrMzE6atHm8ijZ5vliiaTyKOIoyaTyatv3czEKrTpq6ijh5vIowmsCayHmyaTJpMmk0aTCazIowq0zcwJrCaTqKOHmwWLBpOoo6ijRpPIo0/dzcxKtAmsiKNnm8mrCrTpq2ebR5smkwaTJpMKtMmrKrTMxOmrRpPIo2eb5Yomk8ijiKMmk8mrb93tzCq06auoo4ebyKMJrAmsh5smkwaTJpNGkyq0yKMJrM3MCawmk6ijZ5vligaTqKOoo0aT6atP3c3MSrQJrIijZ5vJqwq06atnm0aTJpMmkyaTCazJqwq0zMTpq0aTyKNnm+WKJpOoo6ijJpPJq2/d7cwqtOmrqKOHm8ijCawJrGebR5sGkyaTRpMqtMijCazNzAmsJpOoo2eb5Yomk6ijqKMmk+mrT93NzEq0CayIo2ebyasKtAq0Z5tGkwWLJpNnmyq0yKNKtKzEZ5tGk6ijR5vliuWKZ5sJrCaTRpOQ5W/dS7zpq6ijiKPIo+mr6atHmwaT5YoGk4ebKrSooyq0rMSHm0ebqKNGkwWL5Ypnm+mrRpNHm4/dT91rvOmryKOHm6ij6asJrEaTBYsFiyaTZ5sqtMijKrTNzGebRpOoo0eb5YrlimebCawmk0aTkOVv3Wu86auoo4ijyKPpq+mrR5sGk+WKBYtnmyq0yasqtKzEh5tHm4ijRpMFi+WKR5vpq0aTR5uw5U/da7zpq8ijh5uoo+mrCaxGkwWLBYsGk4ebCrSooyq0zMRnm0aTqKNHm+WK5Ypnm+mrR5tGk5Dlb91rvOmrqKOIo8ij6avpq0ebBpM=",
    "bone": "TZRNlE2UTZxtnE2UrqSupK6krqSupK6klt513nXelt6W3tfu1+bX5tfm1+7X5hTWNNY01hTOFNZNlE2cbZxNlE2UTZSupK6krqSupK6krqR13pbelt6W3nXe1+bX5tfu1+bX5tfmNNYUzhTWNNY01suLqoPLg8uDy4Oqg02UTZxtnE2UTZRNlJbelt513nXedd737tfm1+bX5tfu1+Y01jTWNNZV1jTWy4vri+uLy4PLi+uLrqSOnI6cjpyOpK6kdd513nXelt513pbelt625pbelt6W3jTWNNYUzhTWNNaOnG2cbZyOnI6cbZxRtVG1UbVRvVG1UbWW3pbmdd6W3pbetuaW3pbelua25rbmFM4U1jTWNNYUzhC1MLUwtRCtELUwtdPF08WyxdPF08XTxTTWVdZV1lXWNNbX5tfm1+737tfm1+bzzRTO883zzfPNcb1RtVG1UbVRvXG908XTxdPF083TxdPF08XTxbLFssXTxZbelt513nXedd6W3rLFssXTxdPFssXvrO+sEK0Qre+s76ySvZK9cb1xvXG9kr2SvZK9ksWyxbLFFM4U1jTWNNYUzhTWFM4UzvPN883zzRCtEK3vrO+sEK0QrXG9cb1xvZK9cb1xvZLFssWyxZK9kr001jTWFM4U1jTWNNbzzfPN880UzhTOjqSupK6krqSOpK6k76wQre+s76zvrO+sFM7zzfPN883zzXXedd6W3pbedd513nXedd513lXedd6OnI6cbZxtnI6cjpyOnI6cjqSupK6kjpxV1lXedd5V1lXW9+737tfm1+737vfudd5V1lXedd513m2cbZxtnG2cbZxtnK6kz6TPpK6krqTPpFXeVdZV1lXWVd625rbmtua25tfmtubzzfPNFM7zzfPNbZxtnE2cbZxtnG2c76zPpM+s76zvrM+kNNY01jTWFNY01nXelt6W3nXedd6W3hTO883zzfPN880slCyUTZRNlE2ULJSupK6kz6SupK6krqSW3nXedd6W3pbe9+7X5tfu9+737tfmVdZV1lXWNNZV1gyMDJQslAyMDIwMlK6kjpyOpK6krqSOnLbmtubX5tfmtuYY7xjvGPf37hjvGO801hTOFM4U1jTWLJQMjAyMDJQslAyMjqSupK6kjpyOnI6k1+bX5rbmtubX5hj39+4Y7xjvGO/37hTOFNY01jTWFM5NnG2cbZxNlE2UTZzvrM+kz6zvrO+s76xV3nXedd513lXeVd513nXeVdZV1lXekr2SxXG9kr2Svc+krqSupK6kz6SupJK9kr2SvZLFkr2SvZbmtuaW3pbeluaW3nXedd513pbelt4UzhTOFNY01hTOz6TPpM+krqTPpM+k08XTzbLF08XTxdPF9+737vfuGO/37hjvGO8Y9zj3GO8Y79fu9+7X5tfm1+bPpK6kz6TPpM+kz6xRtVG1UbVRvTC1UbXX7vfu1+bX5tfm9+737tfu9+737vfudd513nXedd513s+kz6zvrO+sz6TPrBCtEK3vrO+s76wQrZbelt6W5rbmtubX5tfm1+bX7tfm1+Y01lXWNNY01jTWz6TPpK6krqSupM+kELUwtTC1MLUQrRC1tua25rbmlua25rbmtuaW3pbmtua25lXWVdZV3nXedd6upK6krqTPpK6krqQwtTC1EK0QtTC1MLW25pbmtua25rbmlt6W5rbmtuaW3pbeVd513nXeVdZV3q6krqSOpK6krqSupHG9cb1xvXG9kr1xvdfu9+737tfm1+Z13nXeVd513nXedd513nXedd513nXe76zvrO+s76zPrO+sUb1xvXG9UbVRvXG91+a25tfm1+bX5tfm1+bX7vfu9+7X5nXedd6W3nXedd4QrRCt76wQrRCtEK1xvVG1Ub1xvXG9UbW25tfm1+a25rbm1+bX5tfu1+bX5tfmFM7zzRTOFM4Uzq6krqSupK6kz6SupLLFssXTxbLFssWyxbbmtua25rbmtuaW3nXedd513pbedd7zzRTOFM7zzfPNbZxtnG2cTZxtnG2c083TxdPF08XTzbLFdd6W3pbelt513nXedd513lXedd513lXeNNZV1lXWVd4=",
    "wax": "lv+W/5b/lv/X/7b/tv9R9lH2MPYw9q7lruWO3RT/NP80/zT/9//3//f/lv91/3X/dv/z/tP+0/6W/5b/tv+W/7b/tv/X/zD2MPYx9lH2jt2O3Y7dNP80/xT/FP/3//j/9/91/3b/lv91/9P+0/7z/pb/lv+W/5b/1/+2/7f/df92/1X/df9V/1X/Vf91/3b/lv+W/9f/9//3/9f/tv+2/7f/NP80/xT/NP80/zT/FP9V/1X/df+W/7b/tv+2/9f/tv+3/3X/df9V/1X/df91/1X/Vf91/3X/df+y/tP+0/7z/tP+0/7z/tP+0/7T/nX/dv+W/3X/tv+3/9f/FP8U/zT/NP/T/vP+8/4U/xT/9P4U/5L+kv5x/vP+9P4U//P+sv6y/rL+df9V/3X/df/X/7b/t/8U/xT/8/4U/9P+8/7z/hT/FP8U/xT/kv6S/pL+0/6z/tP+0/5x/nH+UfYU/zT/NP8U/5b/lv+W/7L+s/7T/tP+kv6S/pL+0/7T/rL+s/5R9lH2MPZR9lH2cf5x/u/t8O0Q7tP+sv6y/rP+Vf81/1X/cf5y/pL+cf4w9jH2UfYx9lH2UfZR9o7druWu5XH+cv5R9nH+EO4w9hDus/7T/tP+sv5V/3X/df+S/nL+kv6S/lH2MfZR9lH2UfZR9lH2ruWu5a7lcf5x/nL+kv4w9jD2Mfbz/tP+8/7z/pb/lv91/7L+sv6z/rL+UfZR9nH+UfZR9lH2UfbP5a7lruVy/pL+cf5x/jH2UfYw9vP+8/7z/vT+df92/5b/s/6y/rL+sv5x/lH2UfZR9lH2cf5R9q7lz+XP5RDuEO4Q7jD27+3w7RDu0/7T/rL+0/5V/3X/Vf+S/pL+kv5y/vDtEO4Q7hDu7+3w7RDujt1t3W3dEO4Q7vDtEO4Q7hDuEO6y/rP+0/7T/lX/Vf91/5L+cv6S/pL+EO4Q7vDtEO4Q7jD2EO6O3Y7druUQ7hDuEO4Q7hDu7+3w7dP+0/6y/rP+df92/3X/kv6y/rL+sv4Q7jD2MPZR9jD2MPYx9s/lruWv5a7lr+XP5a7lruWu5a/lUfZx/nH+cv40/zX/Vf+S/pL+cf5x/s/lz+XP5c/lz+XP5a7lLdVN1U3Vz+Wu5a/lz+Wu5Y7djt1R9lH2MPYx9jT/Nf9V/1H2UfZx/nH+bt2O3Y7djt1u3Y7djt0MzQzNDM0Q7hDuEO7w7c/lz+Xv7XH+cf5x/nL+Vf81/1X/cf5x/lH2Ufau5a/ljt2u5a/lz+XP5U3VTdVN1e/tz+XP5c/lz+Wv5c/lUfZx/nH+UfYU/xT/FP8w9jH2UfZR9o7djt2u5a/lz+Wu5a7lTdVN1SzVruWv5c/lruWu5a/lz+Uw9hDuEO4w9rL+kv6S/hDuEO7v7fDtbd1t3W7djt2O3Y7djt3rzOzMDM3P5a7lruWv5c/lz+Wu5RDuMPYw9hDukv6y/rL+7+3w7RDuEO5u3W3dbd2O3Y7djt2O3QzNDM3rzM/lz+XP5e/truWu5a7l8O3P5e/t7+2S/nH+cf4Q7hDuEO4Q7o7djt2O3Y7druWu5a7lLNUt1U3Vjt2O3W3dbd1N1U3VLdWO3Y7djt2O3XH+cf5x/jD2EO4Q7hDujt1t3W3djt2O3W7djt0s1S3VTdUt1U3VTdVN1SzVLNUs1Y7dbt2O3Y7dUfZx/lH2z+Xv7e/tz+Us1SzVLdUt1U3VTdVN1cvEqsTLxI7djt1u3Y7dbt2O3W3dz+XP5e/t7+1R9lH2cf7w7c/l7+3v7W3dTdVN1Y7djt2O3W7dy8TLxMvEbd1u3Y7djt1N1U3Vbd3P5c/lruWv5VH2UfYx9u/t8O0Q7u/tbd1t3W3druWO3Y7djt3rzMvEy8RN1U3VLNUt1SzVLNUt1Y7djt2O3a7lMPYw9jD27+3P5c/lz+Us1S3VLNVN1U3VTdUt1arEq8TLxAzNDM0MzSzVDM3szAzNjt2u5Y7djt0w9jD2EO6u5a/lz+XP5evM68zszC3VLNUs1SzViryKvIq868wMzQzN68zrzOvM68xu3Y7djt2O3fDtEO4Q7o7druWO3Y7dy8TrzMvELNUs1SzVDM1pvGm8abw="
  } /* CATHEDRAL_TEXELS_END */;
  const tiles = Object.keys(palettes);
  const tileSize = 32, atlasWidth = tileSize * tiles.length;
  const samples = tileSize - 4;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  function surfaceAtlas() {
    const texture = Z(e0(ctx => {
      const image = ctx.createImageData(atlasWidth, tileSize);
      tiles.forEach((tile, index) => {
        const raw = texels[tile] && atob(texels[tile]);
        for (let y = 0; y < tileSize; y++) for (let x = 0; x < tileSize; x++) {
          const u = clamp(x - 2, 0, samples - 1), v = clamp(y - 2, 0, samples - 1);
          const i = (y * atlasWidth + index * tileSize + x) * 4;
          const source = (v * samples + u) * 2;
          const grain = (u * 23 + v * 17 + u * v * 19) % 37 - 17;
          if (raw) {
            const color = raw.charCodeAt(source) | raw.charCodeAt(source + 1) << 8;
            image.data[i] = (color >> 11) * 255 / 31;
            image.data[i + 1] = (color >> 5 & 63) * 255 / 63;
            image.data[i + 2] = (color & 31) * 255 / 31;
          } else {
            const tone = palettes[tile];
            const noise = grain * (tile === "gold" ? .12 : .45);
            image.data[i] = tone[0] + noise;
            image.data[i + 1] = tone[1] + noise;
            image.data[i + 2] = tone[2] + noise;
          }
          image.data[i + 3] = 255;
        }
      });
      ctx.putImageData(image, 0, 0);
    }, atlasWidth, tileSize));
    texture.name = "cathedralBonePatina";
    texture.colorSpace = ha;
    texture.minFilter = YC;
    texture.generateMipmaps = true;
    return texture;
  }

  function sculpt(scene, x, floor, z) {
    const batch = new Map();
    const material = Z(new $e({map:surfaceAtlas(), vertexColors:true, toneMapped:false}));
    function add(tile, shade, geometry, matrix) {
      const uv = geometry.getAttribute("uv"), slot = tiles.indexOf(tile) * tileSize;
      const colors = new Float32Array(uv.count * 3);
      const normal = geometry.getAttribute("normal");
      const orient = new Y();
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i,(slot + 2.5 + uv.getX(i) * (samples - 1)) / atlasWidth,
          (2.5 + uv.getY(i) * (samples - 1)) / tileSize);
        orient.fromBufferAttribute(normal,i).transformDirection(matrix);
        const light = shade * (.64 + Math.max(0, orient.z) * .22 +
          Math.max(0, orient.y) * .18 + Math.max(0, orient.x) * .10);
        colors[i * 3] = light;
        colors[i * 3 + 1] = light * .96;
        colors[i * 3 + 2] = light * .88;
      }
      geometry.setAttribute("color", new y0(colors, 3));
      Yd(batch, material, geometry, matrix);
    }
    const box = (tile, shade, w, h, d, cx, cy, cz, angle = 0) =>
      add(tile, shade, new Ne(w, h, d), E(cx, cy, cz, 0, angle));
    const ring = (tile, shade, top, bottom, bottomY, topY, offset = 0) =>
      add(tile, shade, new Eo(top, bottom, topY - bottomY, 8),
        E(0, (topY + bottomY) / 2, offset, 0, Math.PI / 8));
    const bulb = (tile, shade, radius, px, py, pz, sx = 1, sy = 1, sz = 1) =>
      add(tile, shade, new kV(radius, 6, 4), E(px, py, pz, 0, 0, 0, sx, sy, sz));
    function line(tile, shade, a, b, ra, rb = ra) {
      const p = new Y(...a), q = new Y(...b), axis = q.clone().sub(p);
      const length = axis.length();
      const rotation = new Pn().setFromUnitVectors(new Y(0,1,0), axis.normalize());
      add(tile, shade, new Eo(rb, ra, length + .006, 5),
        new fe().compose(p.add(q).multiplyScalar(.5), rotation, new Y(1,1,1)));
    }
    function trace(tile, shade, points, radius) {
      for (let i = 1; i < points.length; i++) {
        line(tile, shade, points[i - 1], points[i], radius);
      }
    }
    function panel(tile, shade, outline, depth) {
      const position = [], uv = [];
      const uMin = Math.min(...outline.map(p=>p[0])), uSpan = 2 * Math.abs(uMin);
      const yMin = outline[0][1], ySpan = Math.max(...outline.map(p=>p[1])) - yMin;
      for (let i = 2; i < outline.length; i++) {
        for (const [u,y] of [outline[0], outline[i - 1], outline[i]]) {
          position.push(u,y,depth);
          uv.push((u - uMin) / uSpan, (y - yMin) / ySpan);
        }
      }
      const geometry = new h0();
      geometry.setAttribute("position", new y0(new Float32Array(position),3));
      geometry.setAttribute("uv", new y0(new Float32Array(uv),2));
      geometry.computeVertexNormals();
      add(tile, shade, geometry, E(0,0,0));
    }

    // The cased shaft rises within the native blocked pier cell.
    for (const [tile,shade,top,bottom,lo,hi] of [
      ["stone",.70,.74,.79,.006,.077], ["bevel",.86,.68,.74,.077,.145],
      ["stone",.86,.674,.68,.145,.171], ["bronze",.97,.670,.675,.171,.187],
      ["band",.88,.638,.670,.187,.246], ["bronze",.91,.632,.638,.246,.258],
      ["bevel",.85,.621,.632,.258,.282], ["stone",.96,.593,.599,.278,1.728],
      ["bronze",.93,.619,.609,1.726,1.743], ["band",.93,.639,.619,1.743,1.810],
      ["bronze",.95,.651,.639,1.810,1.829], ["bevel",.81,.68,.651,1.829,1.858],
      ["stone",.81,.72,.68,1.858,1.93], ["stone",.68,.77,.72,1.930,2.08]
    ]) ring(tile,shade,top,bottom,lo,hi);

    // A pointed recess, flanked by separate narrow bronze rails and chipped stone.
    const opening = [[-.341,.279],[.341,.279],[.340,1.018],[.323,1.195],
      [.263,1.356],[.163,1.511],[.076,1.624],[0,1.712],
      [-.073,1.623],[-.164,1.508],[-.258,1.361],[-.321,1.198],[-.34,1.018]];
    box("stone",.86,.874,1.48,.137,0,1.009,.495);
    panel("inset",.95,opening,.568);
    const trim = opening.concat([opening[0]]);
    trace("band",1.03,trim.map(([u,y])=>[u*1.048,y,.585]),.035);
    trace("bronze",.96,trim.map(([u,y])=>[u,y,.611]),.017);
    trace("bevel",.94,trim.map(([u,y])=>[u*1.135,.279+(y-.279)*1.038,.571]),.013);
    for (const side of [-1,1]) {
      box("stone",1.04,.060,1.408,.045,side*.417,1.003,.565);
      trace("bevel",1.03,[[side*.398,.353,.594],[side*.39,.889,.602],
        [side*.387,1.443,.600],[side*.341,1.599,.581]],.009);
      for (const y of [.216,1.774]) {
        for (const at of [.21,.478]) bulb("bronze",1.16,.026,side*at,y,.602,1.04,.89,.54);
        for (const at of [.21,.478]) bulb("bevel",1.12,.008,side*at+.002,y+.008,.599);
      }
      trace("band",.86,[[side*.46,.536,.495],[side*.488,.774,.462],
        [side*.49,1.042,.46],[side*.472,1.201,.481],[side*.496,1.423,.459]],.010);
      trace("bevel",.67,[[side*.468,.753,.474],[side*.492,1.034,.459],
        [side*.475,1.199,.485]],.009);
      trace("inset",1.01,[[side*.391,1.449,.599],[side*.376,1.566,.597],
        [side*.312,1.684,.574],[side*.273,1.683,.573]],.013);
      for (const y of [.22,1.761]) box("bronze",1.05,.124,.043,.035,side*.497,y,.465,side*.77);
    }

    // Separate low-poly osseous curves retain their silhouette as the camera turns.
    for (let i = 0; i < 6; i++) {
      const y = 1.367 - i * .105;
      const width = [.167,.194,.225,.233,.212,.170][i];
      for (const side of [-1,1]) {
        const points = [[side*.042,y+.010,.640],[side*width*.32,y-.025,.670],
          [side*width*.58,y-.041,.678],[side*width*.84,y-.029,.663],
          [side*width,y+.008,.637],[side*(width+.014),y+.036,.620]];
        for (let k = 1; k < points.length; k++) {
          const radius = k < 4 ? .0225 : .0175;
          line("bone",1.11 - i * .015,points[k - 1],points[k],radius,k === 5 ? .013 : radius);
        }
        bulb("bone",1.00,.016,...points[5],1.07,1.12,.86);
      }
      bulb("bone",.81,.024,0,y-.012,.658,1.12,.74,.84);
    }
    line("bone",.84,[.002,.804,.639],[0,1.403,.640],.017,.026);
    for (const side of [-1,1]) {
      line("bone",1.03,[0,1.447,.638],[side*.10,1.459,.641],.021,.018);
      bulb("bone",1.08,.041,side*.095,1.463,.642,1.04,1,.63);
    }
    bulb("bone",1.11,.055,0,1.536,.632,.85,1.16,.71);
    bulb("bronze",1.19,.040,0,1.737,.619,1,1.21,.54);

    for (const angle of [0,Math.PI/3,Math.PI*2/3]) {
      const centerY = .681, du = Math.sin(angle)*.099, dy = Math.cos(angle)*.100;
      line("bronze",1.12,[-du,centerY-dy,.614],[du,centerY+dy,.626],.011,.014);
      bulb("bevel",1.25,.017,du,centerY+dy,.630,.85,1.11,.67);
      bulb("bevel",1.14,.019,-du,centerY-dy,.627,.94,1.12,.72);
    }
    bulb("bronze",1.24,.028,0,.681,.639,1,1,.58);

    box("bevel",1.14,.614,.044,.228,0,.303,.592);
    box("stone",1,.683,.035,.24,.011,.270,.595);
    const candles = [[-.166,.089,.639],[.007,.169,.670],[.174,.100,.626]];
    for (const [px,height,pz] of candles) {
      const bottom = .328, top = bottom + height, radius = height > .15 ? .038 : .029;
      add("band",.87,new Eo(radius*1.42,radius*1.27,.013,7),E(px,.323,pz));
      add("wax",.99,new Eo(radius*.92,radius,height,7),E(px,bottom+height/2,pz));
      bulb("wax",.76,radius*.54,px-radius*.68,bottom+height*.48,pz+.005,.57,2.4,.62);
      line("inset",.99,[px,top-.009,pz],[px-.005,top+.023,pz],.006);
      const heightFlame = height > .15 ? .064 : .045;
      line("bronze",1.58,[px-.005,top+.017,pz],[px-.007,top+.053,pz],.019,.015);
      bulb("gold",1.46,.030,px-.009,top+heightFlame*.56,pz+.003,.53,heightFlame/.052,.44);
      line("gold",1.34,[px-.013,top+heightFlame*.77,pz],[px-.019,top+heightFlame,pz],.012,.002);
    }

    const parts = batch.get(material);
    const colors = new Float32Array(parts.reduce((count,g)=>count+g.getAttribute("color").array.length,0));
    let next = 0;
    for (const g of parts) {
      const source = g.getAttribute("color").array;
      colors.set(source,next);
      next += source.length;
    }
    const geometry = Z(BR(parts));
    geometry.setAttribute("color",new y0(colors,3));
    const model = new pt(geometry,material);
    model.name = "cathedralBoneReliquary";
    model.position.set(x,floor,z);
    model.rotation.y = Math.PI;
    scene.add(model);
  }

  function spill(scene, x, floor, z) {
    const texture = Z(e0((ctx,w,h) => {
      const data = ctx.createImageData(w,h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const radius = Math.hypot((x+.5-w/2)/(w/2),(y+.5-h/2)/(h/2));
        const i = (y*w+x)*4;
        data.data[i] = 232;
        data.data[i+1] = 119;
        data.data[i+2] = 48;
        data.data[i+3] = Math.max(0,1-radius)**2 * 151;
      }
      ctx.putImageData(data,0,0);
    },32,32));
    texture.name = "cathedralVotiveSpill";
    texture.colorSpace = ha;
    const material = Z(new $e({map:texture, side:hi, vertexColors:true, transparent:true,
      depthWrite:false, blending:is, toneMapped:false}));
    const position = [], uv = [], colors = [];
    function quad(corners, tint) {
      const tex = [[0,0],[0,1],[1,1],[1,0]];
      for (const corner of [0,1,2,0,2,3]) {
        position.push(...corners[corner]);
        uv.push(...tex[corner]);
        colors.push(tint,tint,tint);
      }
    }
    quad([[x-1.43,floor+.022,z-2.18],[x-1.43,floor+.022,z-.19],
      [x+1.43,floor+.022,z-.19],[x+1.43,floor+.022,z-2.18]],.58);
    quad([[x-.396,floor+.23,z-.677],[x-.396,floor+.75,z-.677],
      [x+.396,floor+.75,z-.677],[x+.396,floor+.23,z-.677]],.59);
    const geometry = Z(new h0());
    geometry.setAttribute("position",new y0(new Float32Array(position),3));
    geometry.setAttribute("uv",new y0(new Float32Array(uv),2));
    geometry.setAttribute("color",new y0(new Float32Array(colors),3));
    geometry.computeVertexNormals();
    const wash = new pt(geometry,material);
    wash.name = "cathedralVotiveLight";
    scene.add(wash);
  }

  const decorate = FJ;
  FJ = function(scene,map) {
    decorate.apply(this,arguments);
    if (T.level !== level || v.grid[row]?.[column] !== "I") return;
    const x = (column + .5) * P, z = (row + .5) * P;
    const floor = ie(x,z-.72*P);
    sculpt(scene,x,floor,z);
    spill(scene,x,floor,z);
  };
})();
/* CATHEDRAL_RELIQUARY_END */
