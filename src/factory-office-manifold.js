/* FACTORY_OFFICE_PRESSURE_MANIFOLD_BEGIN */
(() => {
  const level = 6, column = 44, row = 35;
  const tiles = {
    iron:[68,65,58], bevel:[98,91,73], shadow:[43,38,33],
    copper:[123,76,45], brass:[146,98,53], dial:[175,156,121],
    ink:[40,33,27], oxide:[88,49,34]
  };
  const swatches = /* MANIFOLD_SWATCHES_BEGIN */ {
    "iron": "50FISgdCpTkHQsY5SEqJUmlSB0JISidKpTHnQcY5J0JpUkhKpjkHQuY5RCmmOYUxxjkoSgdCB0LnOaY55kHGOYUxaVJISidCKEoHQudBKEoHQudBSEqqWola50HGQUhK50HGOaY56lrKWqlSB0JoUkhKpTmFMWQxiVJoSkhKR0qpWohSJ0oGQmhSaFJISidKSEonSidCxjnGOaUxSEqpWqlaSEonSidK5kHGOUdKyVqpWolS50HmQcY55jnGOcY5KEInQgdCpTEHQgdCaUpISkhKxjnGOaY5B0oHSgdC5kFoUkhKiVKJUolSB0IHQudB5jnGOcY5aVJpUmhS5kHmQeZBhTGFMYUxB0IHQgdChTGFMYUxSEpISihKiVJpUmlSJ0onSidKJ0pHSkhKqlrKWspaxjnGOcY5ZSllKYUxKEpISkhKB0IHSgdKqlrKWspa50EHQgdCpTmmOcY5KEIoSihK50HnQQdCSEpoSuZBB0onSkhK6mILY4lSB0IHQihKpTGmOUQpJ0IoSkhKJ0pISuZBiVKJUqlSKEJISsY5ZTGFMYYxSErnOedBpjGmMcY5iVInQkhKSErnQSdCaVKJUihKKEpISmlSqVLKWupaB0IoSkhKB0KmOcY5qVJISmhKJ0JISuY5pTHGOedBB0IoSkhKRCllKYUxKEpoUqlSB0IoSuZBSEqJUihKB0LGOedBylppUqlaiVIoSmhSpTnGOQdCJ0pISolS5jkHQsY5xjnmQaUxSEppUidKpjllKYUxaFKpWmhSC2PJWgpjB0JISgdCB0LGOQdCKEppUihKKErnQShKhTnGQYUxaFInQmhKxjkHQsY5aUonQmhKSEoHQkhKZTGmOWUxaFInSmhS6mKpWgpjSEqpWmhSJ0poUkdK6mKpWupiJ0LmQSdKhTHmQaU550FISgdCB0LGOaUxaEooQolSpjHnOcYx4xgkIeQY5kFISidKyVorawpjB0JoUkhKxjknSgdCiFJoUqlaJ0oGQmhKaEonSolSB0LGOShCpjGFMcY55znHOaYxZSlFISQhZTFEKQMhJ0oGSmhSK2sKa+piR0qpWolaR0onSgZKyVqpWolSxjmmOSdCaVJoSkhKSEooQidCZSlEIaYxpjGGKWYpRCnGOaYxJlIGSgVKxkHFQaU5R1JHSidKJ0onSgdKqVqpUolSB0IHQudBhTEHQgZCaEpISkhKpTGFMYUx4xjjGEUp5jnGOcYxBkoGSuZJo0mjSQVaaFJoUmhSa3Nrc2tziVqJWolaqVqpWqlaJ0InQidCxjnGOcY5KEooSihKxjHGMcYxZSllKWUpiFKIUohS6HLocuhyhXKFcoVyiFKIWolaJ0pISkhSpjnGOcY5B0IHQidC5jnnOQdCpTGmMcY5pjGmMaYxRCFEKWUpZClkKWUxqFomUkdSBVIlWiVaaJOJk4mTCmsqa0triFKoWqla5jkHQoUxSEppSolSKErGOeY5ZSmFMaUxZSmFKYYxRSFlKQMZZCmFMaUxR1JnUodaxUHlQYQ5h2qncshy6mqJWsliaFqpWkhShjGmOWUpSEppSgdCpjHGOYUp4xgEIUQhJSFlKYYpwxDjEAQZJ0JISmhSRlJnWodixFEEWiVaK6zJowqkCmvJYupqiFrJWmhSpjHHOYUxSEoHQihCxjmFMcY5whADGaIQJSFmKSUh5BCCCMMQaEoHQkhKh2LIYulqBVpGYgRaaJMHg0iLiFrJYoha6mKpWupipTHmOaUxCELHOShCpTHmOaUxpjHnOaYxRSEEGUUhggjDEIIIpjFlKcYx5kEnSuZBpUFkOaVBZmKnamZiyVqJWupiqVpoUslaZTHGOYUxpjHnQcY5xjmlMWQpKEIHQsY5hjFFKaYx4xiiEAQZZSlFIYYp5jknSgZChDnFQaU55VFGWgZSyVqpWohS6mKpWohaSEqpUmlS5znGOShCpTFlMcY5J0IHQuY5xjmmMWUpohAEGeMYJCGGKWUphTFkKcY5qFqIWuli5knFQaVBaFLKYqlaiVqIUmhSJ0qJUolS50HmOcY5ZCnGOcY5B0IHQuY5BzrmOcY5JCEDIQMZpjGGKWUpJCEDIQMZiFpoUmhSRlImUgZSaFJISkdKR1JHUkdKqVqpWqlaSEooSidCxjmlOaUxB0LnQeZBhTGFMec5SEpISkhKhjGFMYUxBBkDGQMZxjnGOcY55knFSUdaJ0onSidKJ0onSidKaVJpUmlSKEpISsY5ZDFkMWUx5jnmOeZBhTGFMYUxJ0InQihCpjGmMaYxJCEkISQhpjGmMaYxxkHGQeZBSErmQedB5kEHQgdKKEpISsY5hTGmOaY5aEppUolSSErmOeY5hTGlMaY5SEpISuY5hTGmMaYxRClkKWUpRSllKWUpJCEkIUUpB0InSkhKiFonSkdSiVKpWkhKB0InSkhKaEqJUqlSSErnOQdCpjnGOWUxB0IoQkhKB0KlMcY5ZSmFMSQhhjGmMcc54xgEISQh50EnSsZB6mILa8liSEpoUidC5zkHQsY5aUqJUkhKJ0JISuc5xjmFMaUxSEoHQihC5zmlMcY5hTFEKWUp5zmGMcY5JCHjGAQZaFonSmhS6mora2xzKEpoUidKB0LGOQdCSEqJUkhCKEJpSidCB0KmOedBJ0JoSidC5kEnQuY5pjFkKaUxxjkHQqYxJSFmKSQh4yBEKQMhKEoHQkhK5zkoQudBB0LGOYUxaEooQmlKB0JISgdCKErnQaY5iVJISolSpjEHQsY5aUooQudBxjmFMec5JCFlMSQphTnmQcY56mJLcytrSEqJUmhShTHGOaYx5zlISgdC5jkoQgdCpjkHQsY550FISidCZSmmOYUxaUooQgdCB0LGOaYxpjFlKUQppTmFMWQx6mLJWqlapjEHQudBRSkkIaYxKEIHQuc5J0IHQuY5KEqpUolSB0LnOcY5xjmmOYUx50FpSkhK50HGOShKxjmlMYUxaFJIUkdSqVqpWolahTEHQuc5pjGlMYUx5znHOUhKxznGOaYxSEpIQihCaVJoSkhKxjnGOaY55zlpSkhK50HnOcY5hTFlMWUpBkoGSgZK5jloSmhK5znnOec5iVKJUolSKEIoQihCpjGmMaYxBzrnOec5pjGmMaYxZSllKWUpB0IHQgdCpTGFMYUxilKJUolSZTFlMYUxCEIoQihCB0IHQgdCSEpISkhK50EHQgdCxjnGOcY5KEpISkhKB0IHQgdCRCllKWUp5znnOec5xjnGOeY5iVKqWqpaiVKJUihKxznnOedBpjGmMUQp5zkHOghC5znnOYUxZSmFMaYxaEqJUgdCxjnmOQc6qlrKWmhKJ0JISkhKxjllKWUxKEJISkhKqlpISmlSaFIHQidK5kEHQsU5aFKJUslaB0InQkhKZTGlMcY5aFIHQihKB0KlOcY5aUqJUihCB0IoSkhKxTnmOQdCB0IoSkhK",
    "bevel": "JkpnWmda5UFGUiZKZ1KoWmdSBUJHUiZKyGIqawlrKnMJa+lq6WqoYgZKCWvJYohS6WKIWidKh1JnUgZKKmvpYqhaiFpHSkdKR1ImSqhiRlIFSgVK6WKoWmdSJkrlQWdSCWvpYuliCmsJa+lqh1rIYkZSyGKIWuliyGJnUidKiFJnUiZKyWIqawljZ1ImSshaZ1ImUkZSyGKoYqhayFqHUmdSJkoGQgZKqFoqaypr6Wrpauhqh1pmUkdS6WLJYohaiFpHUgZKh1JnUkZK6WLJYqhaJkoGQohSiFpnWodaKmsJawlrqFqHUmdSRkomSkZK6WoJYwlryGLpauhqh1qHWgVKiFqIWmdSZ1ImSgZKBUIGQmdSKmsKawljiFJnUohSBkoFSiZSyGLIYuliiFpnUmdSRkpHSsVBqFqoWshiqFrIYshih1qHWgZKyGKoWqhaqFqIWuZByVrpYslaqFqoWqhaR0omSmdSJkomUmdaiFqoWshih1JnUmhS5UHlQQZK6WIJayprh1rIYuhip1qoWkZSZ1qIUohSiFqHUuZB6WLpYuli6WLpYmdSJkoGSkdKZ1JmWqqLy4uriwyUzItqc2dSCWvoYqhazINKc6uD7Isqcwlzr6QtlKt7SnOLeylrKXNJc8hizIPtgw2ManNKc2pzKmvIYglrBUqHYuuTioOLg26cy4Nqc4daKXMJa0dSDYwJa4t7zIMpcwlzz6RNlMyD6WpKc2p7CWspc8hizIMNjKt7i3uLeylrCWtKc+liBUqnYoqDy4tKe02Uq4NKc2daDYxre0pzzINKc0p7q4MJawlrTZRunGpzKXOLeylransJa6hazIMNjMuDq3sqc2pzq3vtg6x7JlJmWsuLioOrgyyUi4NKc4daLYyrewlrDYwpa6uDi3sJawlrTZSOnIt7SntKcwlrSXPoaqhazIOre+yDSnNreylr7YPMg6t7KmtKe02cy4tqe+yLanspc4daq3usgyprq4Nqc2p7antqe+hqTZQMjKuD6Wroakpz7Iurg2tzrHure+yDa3Mpa2pzrHuLe4t7yGKLg46kioNJe8uL7Ispc4dazINKc2tz7Isqa0p7SnNKewhrbpwtlEpzKXMqcwlrzIOLe2tzzIOse4t7q3tqcylri3uLe+2DyGKKg86sq4tqe46kzINqe6haDYxre8lirIPIYkpz0KTMg2tzbpROlMyDKXPpailzzIPsg0tza3NrewyMCWsJa8hia3NOlO2D6WLLiw+17JPLi22cq4Nqe6haLZSLewpr7Ysqa6uDz6TMg2tzbpxunA2Mansqc4p7rIPMg0tza3OLey2MKmtKcyprzHstjOyDZ1Jpe66sq4uKg02UbpwtlIt7LZQpa6haq3vpYmp7j5yse0tzbpyOnIt7CWvoYklzi3urgypra3OLe6t7yGLpYshii3Psi8yDh1qKg++07JNKeyyUbpQtlIt7zINKc+li7IMqa0pzjpyMe0tz7IstjMyDSnMqcwlranOLeypra3Mqa8uDCWsqayprSnPMg6x7qFqrg42kq4uLg+uLLZQNjAlrzINqcwlji3vpYot7TpRre0pz7IstjOyD6GLIYkpzKmtqewpranMqa+yD7YOse6x7i3ure4t7yGJJe86saoNqg02cLZQNjAlr7IOLe6hazIOoYmp7LZRrc0pzDIxNlIt7KWspaylri3tKcwpr6WIqcwyMrHvtg2tza3MNjIt7R0oJaylzyGJHUshiqFoqa4hSCWtHUkdKJkomSkdSi3uIUqlaiFoJY4hai3PJYglriFJnUuliJkpnUshiyWIJYwpriFLpYmdSZ1LIYmp7h1qoWqhaiFIqa6haKmtoUgZCZ1LmQSZKi3uIUqlaqFqIWslaKmuIWmtzZ1LJYsliJkqIWuliiFJKa8li6WLJWmdSZ1LoYglryGJnUmdSZ1IKa4haqFqIWidC6WKIUktzSnNnUqlaqFqoWkdSa3PJWiprJ0qoWshaJkqIWuliqFrpYgprqFqIWkdKiFoJa0pzh1omUmdS6WIKa6hayFomSsU5KmvJWiprKnNnUidKqFrIWohSCmuIWmtziFKIWqhaJkomSglryVoqa8liZ1JnUqhaJkqnYuhqKmtLc4t7yVoKY4hayFpHSuZByVqIUuliCWtHSgZCqFrIYohaKmvJWiprR0pnUqhaCWPpYot7Z1LJYohaqFrJYohSR0rIYilza3sqc2tzqFoKY6ha6WJnUidKCmvpYktz6WonSgZCRlJnUkdK6WKIUgljJ0pHUohaCmMKa6x7qFoKa8liiFKoWohSR0qIWuVBiFJoUohSJ0poUmhS5kGlOcU5J0onSohSaFJHSsY5aFKIUqhSiFKIUsla5jnmQWdSCmPqYgpriFJnUmdS5kHmOQZC5kEnSiZKyVpHSmhSJ0poUohSBkLFQeZBaFIGQmhKR1JHSuY5iFKpWslaR0pHSohSR0rFOWdSCmMKY6haJ0qoWslaxTnFOeZBBkJHUsU5iFKIUkdK5kFnUuZB6mLJWmhSJ0JHSidKJ0onQsU5iFLJWmdKZ1JoUkdKBkInSkdKCmMKY6laR0pHSmdSBkKEMcU5JkoGQgZCyVpoUqla5kFnUgZCCmNoUqlSaEoGQohSBkonQsU5iFJHSohSBkInSqha5kEnQkdKCmOoWuliBkKIUsla5TnmQcU5CmPqYgpjiFInSmhSxTlHSuZBCmOIUslaBkLFOUdK5kEGQqU5iFJnUqlaR0rmQWdSpTnmQSZKCWOoWuliJkKoWmdSiFKpWohSqFoqa8laR0qIUmdSpTlHSgZCqFqpWmhSxTkHQidKR1LmQcU5qVqIUkdKaFInSiZKBkLmQSZKCmOpWohaR0pnUidK6VqIUmhSqVqpWupiaFJoSkdKR0pHSgZCqVpHSqlaJ0rmOeZBBkLlOaUxJ0qoUohSBkIGQmdS6WKpUslaKmvJWmhSBkKIUohSqFJoSupiyVrqYqhSR0pHSidKR0pHSgZCyVpnUmhK5kEnQkdK5kHFOaUxR0onSqlaR0pHSkdKyVqIUslaKmvpWqhaJ0pHSmdKaEpHSupa6mIKY8laaFKIUohSJ0omQgZCyVpoUohSB0LmOQZCiVqIUmhSR0pHSkdK5kEGQuZBiFJoUqhaiFJnSqlaR0pnSohSqVqpUslaiFKpWohSR0pnSmdSBkImQiZC6mKoWkdKxjmlOeZBiFKIUmhSR0poSmhSB0JHSkdK6mLKWqhaqFpoUkdKBkImQmdKiFKIUqlaiFLJWqla5kEmQidKyVrqYupiaFInSmdKBkLmOSdKR1JoSmhKR0poUohSpTnmQQZCqVqpWohSiFJoUkdS6mIqY+liR0pHSohSqVpoUmhSR0qIUiZCyVrqYmhSiFJHUohSxTnFOQZCyVpnSmhKaEoGQidK5kEnSuU5iFKpUgpjqFqIUohSqFrpWiprqVInSohS",
    "shadow": "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",
    "copper": "JHIEcqNhx4KmgoZ6ZnpFcqaCJHIEeqaS55rGkseKRXokeqaKRIIjgsaSJ6PGmgebhZJlisaSg1mCYYWSxZqFkgejhYokgkWCw2kkcuRphnpmeueKZXpFciVyRXpEemWKppIIm6eKJHokeqaKZIpEgmSKaKsno8eSZYrmmsaSg1mDYSOC5qLGmsaaZIKmikWC42nDaaJhp4LHgqaCRXIkciRyw2lFgoWKx5LGkmaCBHIEeqaKZIpEgoWKBqPGkoWKxpKmkqWKZnJmegejhJKEkgebppJliiR65ZrlmoSSB5vnmkejxpLGkmWKJILloobDZ7tnuyerJqtGs8jLJrMmswaz6csJ1OnLh8OHw4e7x5Ioo0rcp8uny4fDJrMmqyarBaMGo6WSppKmkgabpYqlimWKJILloqfDqMOow2iziLuow0azh8OIw4jDh8PIw6jDRrtHu2e7x5Ioo2rcyMvIy0a75aLmouaq58sHzIfDatxq1GrUZ7OHuyer5qIo3Mn0qvTK9Az97v1t/UjkKeRJ5Arci+zO/Sz9aeyJ9Cnkx5rJu2z9qfTK/GnsauQs9Qv1B8wo1MfDKdQpzErURrNnsyerycOK5M396/wL/cv0rv1M/SjkKdxJ5ArkKeRt/W39KORJ7Ajcx5pHq4z9yvzq/Ajk7PTP/a79KNTHy2a7atzpyynMyLtnsyerR7Oq7O79qvTK/C39jf1M/UjkKeRq7MnTauws/Sz9ivRJ7Ajcx5poq639aOyp9Gnsy/TP/TD+6+Sq3Grcatyr3OnLqLtns6i7aLOr5Ez9auQp3Kvky+yK7IfDKdzo00rkyNOr7Erc6/yK9Kvshoono439SOSJ7KfL7Oyu/c/9itzL5CnUy+SK3MjDqLtns6i7iLtK3I39KdyK5Ivkq+yK5IfDSdwI3GvsCdxq5Kvsy/QM/avsJHpHoyv9aexI5OnTrOyO/c/9J5vmkgebB5vnmiijxpKlkoWKKKNoq4iz5prGmmWKyrupu2izCczpy8nD56KmkoWSR7OJw6m7xGmGgoi7xaImq8WaSKvqu4mzSKMnm8aSxpJIowebxpKlkqWKSKOJs8m7pZKFkseaqbOJu2izp7sJzOnLppplkmSKqcOIu6i7xGmGgsjD5arlooWSibPKu4mzRXKngoZ6RXJFeoaCB5PnkueKhoKGggiTZYJlgiV6KJsoowej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",
    "brass": "BGLjWSVqhnqFeieLJpMmm6ezprPGuwnl6eSHu4nUaNSmu2ejiKtno0rEp6vFioZ65FklYiVihnLoeqdyBWJmamZq5FlmakVqJWIEYuRhZXLHggeLJpMmm8ezx7vnw6jcKu3ow0nUSNSmu2ejqKuHq+iz6LMGk2Vyw1klYiVihnJmcsdyRWolYiViRWJFakViw1GjUQRihnqGesaCBosmmyWjqtTr5Kz9yeSnuyjMJ8wIxEajiKuIqwm8h6PFgqZ6BGLkWQRihnJmckVq5FlGamZq6Hroeuh641njWcNZZXJlcqWC5Yomm0WjKMSJ1Gv1iNzow4nUidwIxGajqKuoqym8qKsGk2Vy5GHkWQRihnKGcmZqBWIFYiVip3LHeud6x3rHesd6hnqmeoV6xYoFkyWjScyK3Iv1yeSnu0jMaNTnu0ajqKsmm8izRpulgiRqhnKGcsd6hnKGcoZqJWIlYmZqCHuncsd66HqGaoZyZXKGeuaKxYIFk0WjSczK3Kz9iNxmsyjMSNTHu0ajJptHo+izh6MGi4VyZnKGasdyhnKncqdy5FnkWSVix3oIg6dypnrHekiTpYImmyjE6uTp5KjkSv3J7Gr9iNynw4jk7P0r9WrUZrOns6rcSNQozIeraJuFcmZyJWJmagVa5FkFYsNZhnLHegiDx3oIgweL5ooFkyjE6eTp5KjkS/3q9Iv9R9SGu+nsy/0r9WrUh7PHu0jUidyJ1GajSJtlcmZqJWoFWiViBWLDUSViZmqncgiD53qmciiLpYJGm+e7rPWs/Yv9yewK9Sn1Z9wls6jkq/0K7ejDh7PIu2nUqtwozKerJ5PHekVqJWIFWkVio1HkWcNZp3KGcud6hXLHeueC5oomm8ezjPWs/Yv96fQq/Wr9JtSGu4jkDP4K7ejDh7Nmq4ncaNRp1GerBoumekVqJWolYuRZ5FmjUSVihmpmasd6hnJlcgeLpYLlkijEa/WL/Yv96fSp7Iv9R9xFs0fc7P3q7Me7h7NmsyjMidwozCWbR5uGciVqJWIlYuRZRmqncqdyRWKncqZyqaOImwm0hqvnw8nka/0K7erkCMyHs6azJKNmq+fDqdwozMezp7OHs6e7hrPmw+fDCcSIq+aS42kFYsRZZmpGakVihmqmcmZqyaOooym8p7Omu4jcSvXp5EjUCMynu8e7ZasFo6a7iNQIxKezJaOHs8e7itTq5InU6Ltno+WK42mCUeRZh2pmaoZqRWJmakVqZ5tnm+izhquGs2fcSvXp5GjUprtFq4azJKPkmoWzaNQIxKezJaMlo2azScyp3EnMx7NHo8WK42mjUYNJJWIlYkViJGJFaiViZ5uImwm0p7PHu8nkCu3J5EjUprtmq6azKMQIxKrcR8znw6ezJaMlo4azadTq5IrUCcQmm8WK42GjUYNRRmJGaoZqZmqmcgRiiJuoo8irhqumu6jci/3J5GjUxsOGs0Wr57vIu4nUqdznw6ezRaNGq6e7KMyp3GnU6Luoq6WK42mjWaNRh2oFYkViJWKGcoZy6LMIvAjEitwIzCjMx7smmwaTxYojcmR6R5PmigeT5oonk+aK5YoGk8WKqKtJxKezh6uHs4ar6btom2Vy5FklYmZqw1FFakVqCLxJxMe7adRJ1AjMx7smmwaTY3pkeqWCBotHk+aK5oonk+aK5YqkguaS6bMIvAi8ZquHq4ar6buIo4VyJWLEWSViJWIkYiVqKLzns+i7CMQIzOfDh7MFmwaTY3pkekNyJ5PmiieTpYIGi+WKyauIo+mzh6tJxMezp7Nmq2Wr6bsGk4Zyo1EFWuRZ5FnkWQRiScQIvKazadTnw0nUhrMFmwabhIIDaoR65opHkweTpYIGi+aKR5uoo4ijyLMIvKazh7NGo+e76bsGk6Z65FnEUSViw1FlagRix7MpvOe7CMSmuyjMZqvlkgaTR5sGi+aKJ5MGi8aK5orlisWKR5uoo6irZ6Oms+e7Zqslo8e76bsGkyRqBGLkWeRZgkklYuRZhrNlqySjKMSHs+aSRHokauNhx3qmeoZyJWokYoZyBGIEYuRhZWpFaueC54JHk4ejJpsFm4arCcQpxKerRHKjWQVipFHEWURyacxpzCjEx7tGq8WKJHIEauNhRWrHeqZ6ZWpFakVq41njWeNZZWpFaoZyhXrliiabBZNGo2arCMQpxKerZHrEWcRZRmpmageLitSK1Oe7hrMlo6WKI3IEauNhZXJlamVqJGIkaiRiw1nDWeNZZnJmcqZ6xoInk4ejZqNGo2arCcRJzOizpYKDUYNRJWJmaueCCMQoxAjEx7tmqwaTA2oDauNhZnJmcoZyRWrjWeNZolGjUcNZZnKGcsd6ZHLlikabCbzouynE6MPHu2ajI3KjWcRZZmqncsaCKcRJzEnMhrNGo+aSZXoDauNhhnKmciVqBGIlakVqglGjUeNZhnIkYmVypXomkyWb6LPouynEhrPnu4erZHrkYYNRRmKHckiTyLNmq2ejBpNEciRq5FmCUaNRhnJFaoZyRWoEYkRqB4OmcqdyZmoEYiViglHDWUVyBovIqwm8RquHs+e7JaOEggRq5FklYoibZquns6irxYqFegRiw1mCUcNZBGJlcsd6BGJFaiRq53qGcqdy5FklYsRZo1kkYiRqaJuoqwm8Rquns4arRqvFisNhRmoFYoibZqvHs0ajBpNEcsNZhnJFaoZyJGJmcmVqRWoEYuNhpnpmcqZy5FklYuRZ5FnDWeNhJ5OHo+i7Rquns4azScxHm+eCBWLEWWibp7Nmq4erxYokciVqhnJFaqdyJWokYoZyBGLDWURqpnJlaqZyBFrDWQViglGCUSRqB4vps+i7RqvHu8ezCLyIo6Z65FlGYkeTp7OHqyabhIJlegRiRWolYoZyRWolaiRqJGoEYgNiZXJFaoZy5FnDWaNRhnKGcseC5orIq8izRqslo8ezCcQnm2VyJWIFYieTRqMmm8aK42GjUaNRJWJFamVqpnqmesZ6BGIDYiNqpnoIg8d6RWpFagRiZmolYmZqRWpHkynEx7vEkuSaScwpxAeLBGLEWSeTRqNGo4WCglliSWJJBGIlYmVqJGpEakRqhnoHg0iLB4Pngsd6RWpFaiVqhnJmaiViBGIGkwm8p7vEkuSaaczou8aCw1mjUQaLh6OHq8aK42HDWUJJBFolYmVqRWplcoVyx4LneieL54Lngsd6ZWrjWcNZRWolYuVZ5GEGiwm8p7vkmgWbitQpxAeLJWKDUeaKh6slm2R6ZnpmaoZqxFkkYmVqRWqFcqZ6hnKGcuaCpnrGeqZ641njYeRhZmpGaiZiw1nGiui7p7vkmiWjKMzHu8aC5FnkWcWCJptGo6WCRXIlamZqRmokYmVqZXIkamVyx3rngsZ6pnrGesZ642EEYiRiJWIFYgVaJGrFgui7p7sFm8SSacwIxIV6o1HEUUeT",
    "dial": "BFLkScRJ52rGaqZiioMmUgVKp2KHYkycrqytrA+1bKQsnI6kDJTrk02crqyNpM6sbJwsnG2k65MLlEycDJTri+uLSXvriyyUo0ElUiVSxmqmaihzioMmUiVSyGqoYgyUbaQPte+0TJwsnK6sLJwMnAyU77TPrK6sTJwrlI2kC5QsnAuUTZwslKuDKXNMnCyUhmKGYoZibKRsnM6sbKTIasdi5UlGWkycrqxwxXC9baRspO+0baRtpG2k77TvtM6sbaTOrI6kD7UPve+0jaRtpM6sTZxMnCycSHtIe0l7LJxMnO+0razri+uLx2rHaiyUzqxwxXDFrqyurO60D7UPtQ+1kcVQvTC9zqzOrK6sML0wvTC9rqyOrI2kLJwsnAuUioOqi0h7LJQsnK6sbaSNpI2kLJwsnK6sUL2RxbLNML1Qve6scMVxxXHFD7UPtQ+1zqzOrO+0ccWRxZHFD7WNpI2kLJwLlAuUSHtpg4mDbaSupK2kbaSNpK6sTJxtpG2kMLVxxZHFML1Qve60kcWxxbHFcb1Qve+0rqzOrO+0kcWxzTC9zqzOtO60jaQLlAuUiYOqi+uLjaSupO+0TJyNpM6ssc1QvZHFcMUPtVC9D7VQva6sUL1xxZHFz7QwvVC9rqzOrM60kcUvvVC9D7Uwva6sbaRtpOuT6oupg+qL7qytpO+0z6yurO+0UL2RxdLNL7VQve+07rQPta6sccWRxVDFML0vvVC9ML3OrM6skcVQvXHF7rQPtS+9baRtpI2sL70PtVC9rqwPtc6szqzOrA+1ccWyzZHFccUwvXHF7qwvte6sss1wxdLNUL2xxVC9UL0PtTC9cMWxzfLNUL2RxQ+10s0wvXDF7qxQvQ+1jaTvtM6szqzOrC+9kcVwxdLNUL2RxXDFzqwPte600s2RxRPWkcVxxbLNML2RxTC9ccXSzZHFkcVQve60sc0vvXDF77TutFC9D7XutFC97rTOrK6sss1xxZHFkcVxxVC9UL0vte+08s2yzbLNML2RxXG90s0T1vPVccXSzZHF77RQvQ+1UL2RxVC9L70PtQ+1D7VwxVC97rTutM6s0s2yzbHNML0PvZHFD7XvtM6sML2xzZHFD7UPte+0E9byzbLNML0wvZHF77TOrI6kkcVxxVC97rRwxXDFL70vvQ+1rqyurK6sML0vvbLNUL1QvVC90s2yzZHFML0wvQ+1ML0wvTC90s3SzbLNUL0wvQ+1ML0Pte+0cb1QvS+1D7UPtS+97rTvtO+0rayurM6sUL1QvVC977QPtQ+1scWxzZHFUL1QvVC977TvtO+0ss2yzbLNUL1QvVC97qzOrM6sML0vtQ+1UL1wxZHFUL3OrO60kcWxzdLNkcWRxbLNcMVxxe+0scWyzdLNkcWxxbHFcL1xxe+0scWyzdLNccVxxZHF89Xz1fPND7XOrM6scMUPtVC9D7UvvQ+1ML1xxZHF0s3yzZHFUL0wvVC9ccWxxdLNscXSzVC9D7UwvVC9E9axxbHFcb1xxZHFccWRxZHFUL1Qvc6szqwPtVC9jaTOrK6s77QwvXHFkcUwvXDFML3OrO60kcVQvXHFUL3vtA+10s1QvZHFccWRxXHFML1Rve+0ccWRxe+0rqyurEycD7VQvQ+17rStrI2sccUwvXHFML1QvQ+17rQPta6sccUwvVDFUL0PtVC9kcWxzdLNUL2RxVDFML3vtBC1ksVQvVC9jqSOpM6s77TOrA+1rqwPte60ss2RxdLNUL1xxS+98s2xzfLVUMUvvXDF7rRQvQ+10s1xxbLND7VQve+0z7QsnG2kDJRNnIqDioMIcylzjaTvtM6s77TOrM6sss2RzfPVUL0PtXC9sc2RxdLNcMXSzbHNL72xxXDF0c3y1dLNcL0wvcuLy4vIaqdiaYMoe0mDx2olWmZirayNpA+1ccVxxdLNUcVxxVC9cMUwve+00s2RxXC9D7WRxXDFD7XutFDF0s2RzfLVrqSNpKhiyGJmYkVaiJPqm8mbR4vneqZyzqzOrK6sUL2yzbLNUL1wxVC977RQvS+9kcVwvTC9kMWQxXDFD7UPtQ+18tXy1dLVjaRtpKdiyGKGYmZiyZOJk4iTqJvGcqZyjaSurK6sUL1QvXG9D7UwvTC9zqyurK2sD7VxxXC9D7UPte+0rqyurO60cMVwxVC9qoOqgyZSKnOqi4qLCqwKpOmrh5vGgqV6C5QLlCyczqzvtDC977QPtTC1zqzOrM6sUL1QvVC977QPtQ+17qzvtC+9sc1QvVC9ioOKgwVKh1pJe0l7iJOIk2ebJovFesV6LJxMnG2kUL1xvTC977QwvVC9D7UPtTC9ML0wvVC9D7UvvS+90s1xxbHNcMUPtQ+1SXNJc2dSZ1roaghzKHsoe2iLB4NkamRqTJyNpCycD7UwvZHF76wwtVC9ML3OrM6sccWRxS+9D7UvvTC9cMWRxdLNsc1Qve60KXMpc0dSZ1oJcylzSIPncieD5nrGckRiTJwLlEycML3vtFC9rqzvrDC1UL1xxZLF77QPtVC9rqzurO+0ML1xxdLVML3utC+1p2LoamdSh1roaglrRlpmWqdqyGrIamZiyosMlOuTjqRNnM6srqyupO+0ML1RvRC177SurO+077SurA+1UL2RxXHFUL3riyyUh1pGUmdSqFrpYodaRlLlQQZKRlJnWoharqyNpO+0TZyurI6kjqSNpO+0UL0PtXG9zqzvtK6srqyNpA+1cMWyza6kDJTIYoda6WKoWkpzqGIpc+hiZlKnWkZSCWvIYglrzqyurI2kjqRtpG2kbaSNpG2kccVQvZHFD7WurA+1rqyNpA+1ccVQvc+sTZxnWshiqFqHUkpzqGKoYglrh1pGUoda6GKnYuhqjaQPte+0jaSNpO+sbaRtpE2cUL0wvQ+1rqzvtO60UL0wve+sjqRtnMhiyWIGSuVBKWsJaw2Uq4Oqg2p7qoNpe2l7qoNMnAyUjaSNpI2kzqzOrK6sTJwsnCycjqwQvTC9zqzOrK6sbZxtnGtzCWvpaidKxUGHWodaLJSOpA+1raSNpGycyouqiyycjaTOrI2kTJxMnE2cTJxMnG2kD7UPtQ+1zrTOtM6sbaSKg4qDyGLIYgZKJ0onSglrqFoMjOuL77TvtA+1raytrK2sC5QLlOuTTaRspEykTZxtpAuUC5QsnEyc77TvtA+1zrTvtO+0rqzLi8uLKmsqawZCpTnFOahaRlKqg6qDzqzOrA+1rayurK6sLJyqi6qLLJwsnCycC5QslEycTJxtpAuUzqwPtS+97rQPtYqDSXsGSiZKJ0pHSmdSJlJHUuuLqoONpCuUrqyurM6sjaTOrEycD7UPtQ+9zrQsnCycbJyNpM6sK5xMnG2kjawPvVC9zqxspOhqyGJDKWMxJkpHSuhqyGLoao2ky4tspI2krazOrM60rqxspI2kcMWQxQ+97rTOtGyk",
    "ink": "AylkMSMxoSADKeIgIzGFOWQ54ihEMQMpgRjiKMIgZDFEMQMpAyniIMIYpTkkKQMhAyHjIKIYohiBEEAIJCkDIcMg4yCiGIEQQzEjKYQ5AyniKMIgxUGlOYU5AyniKGQx4iDCIKEYZDFEKSMpoRgDKeMgZDEDIWUx4yDCIKIYwhiiGIEQ4yBEKSQpwhihGAMhRDFEMSMxwiDBIKEYpTmFOYU5IykDKQIpZDnmQcZBIykjKQMpoRiBGAMphTkkKSQpwhiiGKIYwhiiGIEQAyHjIOMggRBhEOMgRDFEMUQx4ijiKOIoZDlkOWQ5IykjKSMppTmlOYU5AykDKQMpwiCiIKIYJDEDIQMhohiiGKIYQAhACMIYRClEKSQp4yDjIMMg4iDiIOIghTmFOYU5RDFkMWQ5IykjMcEgRDFEMWQx4iDjIAMpwhjCIMIgZDEkKUQp4yADIYEQAykkKSQpwiDjIOMgohiiGKIYIykjKUQxZDGEOYU5ZDFkMYU5wiDiIAIppTmlQcZB4iDjIAMpwiDiIAMhIynjIAMpwiDjIIEQJCkkKUQpAykkKaIYYRCBGKIYQzHiIAIppUHGQWQ5RDFkMQMp4iACKSMpRDFkMYU5IynCIOMgpTlEKWQxRCkkKcIYohjCGOMgAykkKUQxohjCIOMgwhhhEIEYwiDiKCMpZDGFOcZBIylEMQMp4iADKcIghTkjKWQxAynCGOMgpjlkMYU54yDjICQpgRCiGOMgJClEMQMh4iADKcIYoRjCIIEQwiADKcIghTlEMYU5AikjMQMpxkGFOcZBIylkMSMp4iChGOIgIylkMSMpAykkKeMgwiCBEMIYAylEMQMh4yCiGOMgQBCBGEAQ4iChIAMpZDGlOWQx4iAjMQMp5kGlOWQxZDEjMYU5wiCBGOIgRCmFOUQxRDHjIKIYohhhEMIYAynjICMpgRjjIKIYohhhECAIxkGlOYU5hTlkMSQxwiADKeIoRDGlOYU5AylkMUQxgRjjIMIgJCkDIWQx4iCBGOMgYRBACKIYAyHjICQpohiBEOIgRCkDKeMgZDHGQaVBRDEjKQMpIykDKQMpZDFEMcZBRDEjMSMpgRDiIMIgRCkjKQMhIynjIMIYQBAgCKIYAyHjIMIYwiDCGKIYAyHjIGUxZDFkMUQx4ijiIGQxAyniIOIoZDlkMUQxAiniIOIgwiDCIMIYRCkjKSMpwhiBEGEQhTFlMWUxAyHjIMIYYRBhEEAQwhhEKSQphTmFOYU5RDFEMUQx4yDjIAMppTmlOaU5RDFEMUQxwiDCIMIgZDFkMWQxAynCIMIgZDFkMWQxAyEDIeMgohiiGKIYJCkkKSQpIykjKUQxAykDKQMpwiDiIAMppTkjKUQxAykDKQMphTGFOYU5RDFkMeIgoRiBEIEQJCkkKUQpAyEDIWEQIAhACEAI4yDjIAMhRDFkMWUxRDHCIOMgwiDiIAMpIylEMWQxIylEMeIgRDFlMYU5wiDiIAMpwiDCGGAQAyEjKSQpAyGBGKIYYRCBEKIYwhjjIOMgRDFkMQMp4iADKaIgZDGFOUQxIylEMWQxwiDiIAMpIylEMWUxwiDjICMpYRBhEKIYwhjjICQp4yCCGKIYZTEDISQpAyGiGMIgZTEjKUQxoiDjICMpZDGFOWQxRDGFOSQxIynCIAMpAylEMYUx4iAjKcIgohjCGGEQJCnjIAQpYRCiGMIYAyFEKeMg4yADKcIYAylEMQMp4yiiIAMpRDGFOUQxRDEDKUQxwiADKcIgZDEjKWUx4iAjKeIgpjlEKQMhAyHCGAMhYRCiGGEQJCnjICQpohjjIKIYIyniIEQxwiADKeIgJDGFOWQxZDFEMQMpAynCIKEYRDEjKWUx4yDCGAMpZDEDIWUxwiAkKeMgYRDCGIEQwiAkKeMg4yDCGIEYJDEDKeIgAynCIKEYAyllOWQx4yhEMSMxpTlkOcZBIykDKWQx4yDCIKEYhTlEKQMpohgDIeMgYRDCGIEQ4yDCGCQpohiBGGEQZDFEMUQxwiDCIKEYpTmFOYU5AykDKeIg5kHGQaVBIykDKeMgAynjIOIgRDEDIWUxAyHjIOMgYRBhEKIYJCkDIeMggRBhEOMg4ijiIOIgZDHmQcZBhTlkOWQxIykDKQMphTmFOWQ54iDiIMIgAyHjIOIgZTEkKSQpwiDCGMIYYRBhECAIohiiGKIYwhjCGMIYAykDKSMppTmlOaVBZDFkMWQ5IykjKSMpxkHGQcZBwiDCIMIggRiBGIEYIynjIAMhohiiGMIYYRBhEGEQ4yDjIOMgohiiGKIYAykjKaEYRDFkMWQxIylEMWQxoRiiIMIgZDGFOYU5IylEKcIggRihGKEYRDEkKUQpgRCBGKIYRClEMUQpAyGBGKIYYRBhEIEYoRjCIOIgpTlEMWQxIylEMYU5wiDiIAMppUFEMWQxIylEKcIgoRjCIOIgAynjIAMp4yCBEKIYRCllMeMgohjDIOMgQAhhEIEQwiDjIKEYRDGFOSMpAykkMeIowiADKaEYZDGFOSMx4iADKcIghTGlOUQxIykkKcIYohjCIIEQJCllMeMgwiCBEKIYgRAgCGEQ4iChGMIgpTlEMYU54ygjKQMp4iChGMIgpTlEMYU5wiADKcIghTkkKWUx4iDjICQpgRDCGGEQRCnjIAQpgRDCGOMgYRCBGEAI4iChGOMgRDEDKUQxwiADKeIgpkFlOcZBJDHjKEQxgRjiIKEYZTFEKYU54yCBEMIgQAiBGEAQJCnjICQpghjjIKIY4yBEKQMhgRjCIKEYAylkMSMpohgDKeIgRDGlOWU54yhEMSMpAyHCIKEYhTlkMSMpJCnCIKIYohiBEEAQJCkDIcIYwhiCGGEQRCkkKeMgZTFEMaY5RDEjKQMpAynjIOIgRDEjKYU5IykDKeIgwiCiGIEYAyFkMUQpwiCBEOMgRDEkKQMpJCkDIcIYYRDCGKIYAyHjIEQphTmFOWQxAykDIeIgAynjIAMpZTFkMUQx4iBkMUQxohihGIEYAykDIWUxAynCGKIYJCkjKQMhJCkDKeMggRCBEGEQ4yDCGEQphTmFOYU5JCkjKSMpwiDCIOIgZDFkMUQxAykDKeMoZDFEMUQxAyHjIOMgoRhhEGEQ4yDjIOMggRCBEAMhohiiGKIYJCkkKSQpIykkKUQp4yADKQMpwiDCIOIgZTGFOQMpwiDCIMIgRClEMUQxAykDKSMp4iCiGMIYRDFlMeMgohiiGKIYQRBhEGEQAyEDIQMhRDFkMWUxwhjCIOIghTmlOcZBAykjKUQxAykjKSMpIykkKUQxAykjKUQpgRBhEGEQBCkkKcIYgRCiGKIYYRCBECAIwhjDGOMgZTEDKSQpAykjKcIghTmlOUQxIylEMWU5wiDiIAMphTkjKUQxIynCGOIgwhiiGEAIAyEkKUQpgRiiGMIYIAhACGEQBCmiGOMg",
    "oxide": "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"
  } /* MANIFOLD_SWATCHES_END */;
  const names = Object.keys(tiles);
  const tile = 40, inset = 2, stamp = tile - inset * 2, columns = 4;
  const width = tile * columns, height = tile * names.length / columns;
  const clamp = (n, lo, hi) => Math.max(lo,Math.min(hi,n));

  function atlas() {
    const texture = Z(e0(ctx=>{
      const p = ctx.createImageData(width,height);
      names.forEach((name,slot)=>{
        const raw = swatches[name] && atob(swatches[name]);
        const ex = slot % columns * tile, ey = (slot / columns | 0) * tile;
        const tone = tiles[name];
        for(let y=0;y<tile;y++) for(let x=0;x<tile;x++){
          const u=clamp(x-inset,0,stamp-1), v=clamp(y-inset,0,stamp-1);
          const source=(v*stamp+u)*2, dest=((ey+y)*width+ex+x)*4;
          if(raw){
            const rgb=raw.charCodeAt(source)|raw.charCodeAt(source+1)<<8;
            p.data[dest]=(rgb>>11)*255/31;
            p.data[dest+1]=(rgb>>5&63)*255/63;
            p.data[dest+2]=(rgb&31)*255/31;
          } else {
            const pit=((u*47+v*31+u*v*3)%37-18)*.59;
            const scuff=((Math.floor(u/2)*19+Math.floor(v/3)*31)%17-8)*.68;
            for(let c=0;c<3;c++)p.data[dest+c]=tone[c]+pit+scuff;
          }
          p.data[dest+3]=255;
        }
      });
      ctx.putImageData(p,0,0);
    },width,height));
    texture.name="factoryPressurePatina";
    texture.colorSpace=ha;
    texture.minFilter=YC;
    texture.generateMipmaps=true;
    return texture;
  }

  function manifold(scene,x,floor,z) {
    const batch = new Map();
    const mat = Z(new $e({map:atlas(),vertexColors:true,toneMapped:false}));
    function add(name,shade,geo,transform) {
      const uv=geo.getAttribute("uv"), normal=geo.getAttribute("normal");
      const slot=names.indexOf(name), slotX=slot%columns*tile, slotY=(slot/columns|0)*tile;
      const values=new Float32Array(uv.count*3);
      const n=new Y();
      for(let i=0;i<uv.count;i++){
        uv.setXY(i,(slotX+inset+.5+uv.getX(i)*(stamp-1))/width,
          1-(slotY+inset+.5+(1-uv.getY(i))*(stamp-1))/height);
        n.fromBufferAttribute(normal,i).transformDirection(transform);
        const b=shade*(.57+.31*Math.max(0,n.z)+.17*Math.max(0,n.y)+.07*Math.max(0,n.x));
        values[i*3]=b;values[i*3+1]=b*.96;values[i*3+2]=b*.91;
      }
      geo.setAttribute("color",new y0(values,3));
      Yd(batch,mat,geo,transform);
    }
    const box=(name,shade,w,h,d,u,v,depth,angle=0)=>
      add(name,shade,new Ne(w,h,d),E(u,v,depth,0,0,angle));
    const cylinder=(name,shade,top,bottom,h,u,v,depth,plane="z",sides=12)=>
      add(name,shade,new Eo(top,bottom,h,sides),E(u,v,depth,plane==="z"?Math.PI/2:0,0,plane==="x"?Math.PI/2:0));
    function bevel(name,shade,left,right,bottom,top,back,front,corner) {
      const path=new Ku();
      path.moveTo(left+corner,bottom);
      path.lineTo(right-corner,bottom);path.lineTo(right,bottom+corner);
      path.lineTo(right,top-corner);path.lineTo(right-corner,top);
      path.lineTo(left+corner,top);path.lineTo(left,top-corner);
      path.lineTo(left,bottom+corner);path.closePath();
      const geo=new hV(path,{depth:front-back,bevelEnabled:false});
      const points=geo.getAttribute("position"), uv=geo.getAttribute("uv");
      for(let i=0;i<uv.count;i++){
        uv.setXY(i,(points.getX(i)-left)/(right-left),(points.getY(i)-bottom)/(top-bottom));
      }
      add(name,shade,geo,E(0,0,back));
    }
    function bolt(x,y,depth,r=.067) {
      cylinder("shadow",.75,r*1.19,r*1.14,.025,x,y,depth);
      cylinder("oxide",.92,r*.84,r,.041,x,y,depth+.021,"z",9);
      cylinder("brass",.92,r*.69,r*.84,.017,x,y,depth+.041,"z",9);
      box("ink",.84,r*1.01,r*.17,.005,x,y,depth+.055,x<0?-.27:.38);
    }
    function pipe(name,shade,points,r,sides=10) {
      const positions=[], uv=[];
      const rings=points.map(([x,y,z],i)=>{
        const from=points[Math.max(0,i-1)], to=points[Math.min(points.length-1,i+1)];
        const dx=to[0]-from[0],dy=to[1]-from[1],l=Math.hypot(dx,dy)||1;
        return Array.from({length:sides+1},(_,j)=>{
          const a=(j%sides)*2*Math.PI/sides,c=Math.cos(a),s=Math.sin(a);
          return {p:[x+c*r*dy/l,y-c*r*dx/l,z+s*r],u:j/sides,v:i/(points.length-1)};
        });
      });
      for(let i=1;i<rings.length;i++)for(let j=0;j<sides;j++){
        const a=rings[i-1][j],b=rings[i][j],c=rings[i][j+1],d=rings[i-1][j+1];
        for(const {p,u,v} of [a,c,b,a,d,c]){positions.push(...p);uv.push(u,v);}
      }
      const geo=new h0();
      geo.setAttribute("position",new y0(new Float32Array(positions),3));
      geo.setAttribute("uv",new y0(new Float32Array(uv),2));
      geo.computeVertexNormals();
      add(name,shade,geo,E(0,0,0));
    }

    // Shouldered iron housing surrounds the original stem without replacing it.
    bevel("shadow",.88,-.43,1.34,1.86,2.89,.033,.211,.079);
    bevel("bevel",.88,-.413,1.318,1.886,2.877,.167,.236,.066);
    bevel("iron",1.03,-.367,1.265,1.936,2.839,.224,.270,.059);
    bevel("shadow",.87,-.275,1.182,1.975,2.812,.265,.288,.039);
    bevel("iron",.94,-.228,1.125,1.999,2.789,.283,.310,.046);
    box("bevel",1,.82,.023,.021,.31,2.787,.321);
    box("shadow",.94,1.44,.034,.043,.45,1.941,.284);
    for(const u of [-.255,1.168])for(const y of [2.052,2.719]) bolt(u,y,.305,.068);
    for(const u of [-.080,.062,.204]) {
      bevel("shadow",.91,u-.064,u+.064,2.048,2.724,.310,.323,.037);
      bevel("ink",.95,u-.038,u+.039,2.077,2.696,.326,.336,.025);
      box("bevel",.83,.014,.495,.006,u+.057,2.361,.335);
      box("iron",.88,.049,.016,.009,u-.007,2.135,.340);
    }

    // The gauge remains an analog prop. Its short needle avoids the ticks.
    const u=.725,y=2.386;
    cylinder("shadow",.8,.335,.346,.071,u,y,.329,"z",22);
    cylinder("brass",.99,.318,.320,.061,u,y,.377,"z",22);
    cylinder("oxide",.95,.289,.303,.041,u,y,.407,"z",22);
    cylinder("shadow",1,.281,.293,.018,u,y,.429,"z",22);
    cylinder("dial",.98,.273,.273,.012,u,y,.440,"z",22);
    for(let i=0;i<12;i++){
      const a=Math.PI*i/6,large=i%3===0,r=large?.234:.240;
      const h=large?.052:.028,w=large?.016:.014;
      box("ink",1,w,h,.004,u+Math.cos(a)*r,y+Math.sin(a)*r,.448,a-Math.PI/2);
    }
    const needle=.82;
    box("ink",.94,.026,.351,.009,u+.025,y+.027,.455,needle-Math.PI/2);
    box("oxide",.93,.013,.108,.009,u+.085,y+.094,.460,needle-Math.PI/2);
    cylinder("brass",.88,.034,.042,.022,u,y,.458,"z",10);
    cylinder("ink",.80,.011,.011,.008,u,y,.482,"z",8);

    pipe("copper",.94,[
      [.045,3.448,.163],[.29,3.448,.190],[.479,3.447,.228],[.586,3.417,.240],
      [.661,3.351,.258],[.707,3.263,.272],[.715,3.128,.273],[.715,2.859,.273]
    ],.092);
    cylinder("brass",.85,.129,.136,.075,.17,3.449,.179,"x",10);
    cylinder("oxide",1,.097,.098,.037,.45,3.448,.222,"x",10);
    cylinder("oxide",.96,.176,.175,.30,0,3.448,.138,"y",12);
    cylinder("brass",.93,.111,.123,.105,.716,3.029,.279,"y",8);
    cylinder("iron",.99,.128,.129,.054,.717,2.957,.277,"y",10);
    cylinder("bevel",.91,.111,.114,.042,.714,2.915,.278,"y",10);

    pipe("copper",.82,[
      [.718,1.913,.232],[.719,1.678,.245],[.692,1.574,.263],
      [.635,1.522,.270],[.529,1.498,.270],[.357,1.498,.255]
    ],.086);
    cylinder("brass",.88,.119,.120,.118,.719,1.752,.244,"y",8);
    cylinder("oxide",.92,.103,.103,.044,.718,1.673,.247,"y",10);
    cylinder("brass",.83,.115,.118,.124,.372,1.497,.252,"x",8);
    box("shadow",.82,.055,.224,.206,.279,1.492,.150);

    for(const [y,depth] of [[3.992,.133],[1.112,.139]]) {
      box("shadow",.9,.386,.175,.104,.136,y,.090);
      bevel("iron",.97,-.132,.325,y-.078,y+.080,.113,.172,.028);
      cylinder("bevel",.91,.143,.142,.096,0,y,depth,"y",12);
      bolt(.264,y,.177,.042);
    }

    const parts=batch.get(mat);
    const colors=new Float32Array(parts.reduce((n,g)=>n+g.getAttribute("color").array.length,0));
    let cursor=0;
    for(const part of parts) {
      const values=part.getAttribute("color").array;
      colors.set(values,cursor);
      cursor+=values.length;
    }
    const geometry=Z(BR(parts));
    geometry.setAttribute("color",new y0(colors,3));
    geometry.translate(0,-2.386,0);
    geometry.scale(.845,.872,1);
    geometry.translate(-.057,2.246,0);
    const mesh=new pt(geometry,mat);
    mesh.name="factoryOfficePressureManifold";
    mesh.position.set(x,floor,z);
    mesh.rotation.y=-Math.PI/2;
    scene.add(mesh);
  }

  const decorate=FJ;
  FJ=function(scene,map) {
    decorate.apply(this,arguments);
    if(T.level!==level || v.grid[row]?.[column+1]!=="#")return;
    const stem=map.decor?.find(d=>d.k==="pipedrop"&&d.x===column&&d.z===row&&d.r===-Math.PI/2);
    if(!stem)return;
    const x=(stem.x+.5)*P,z=(stem.z+.5)*P;
    manifold(scene,x+P*.5-.012,ie(x,z),z+.35);
  };
})();
/* FACTORY_OFFICE_PRESSURE_MANIFOLD_END */
