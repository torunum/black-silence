/* HELL_ASCENT_LANTERNS_BEGIN */
(() => {
  const texels=/* ASCENT_TEXELS_BEGIN */ {
    iron: "4yBhEIIQgRCBEIIQohiiGMIY4yDCGOMgAyEjKQMpIynjIOMg4yDjIMIgwiDDIOMgwyDCIKIYwhjCGKIYwhjjIOMgYRCCEIEQgRCCEKIYohjCGOMgwhjjIAMhIykDKSMp4yDjIOMg4yDCIMIgwyDjIMMgwiCiGMIYwhiiGMIY4yDjIGEQghCBEIEQghCiGKIYwhjjIMIY4yADISMpAykjKeMg4yDjIOMgwiDCIMMg4yDDIMIgohjCGMIYohjCGOMg4yBhEIIQgRCBEIIQohiiGMIY4yDCGOMgAyEjKQMpIynjIOMg4yDjIMIgwiDDIOMgwyDCIKIYwhjCGKIYwhjjIOMgYRCCEIEQgRCCEKIYohjCGOMgwhjjIAMhIykDKSMp4yDjIOMg4yDCIMIgwyDjIMMgwiCiGMIYwhiiGMIY4yDjIGEQghCBEIEQghCiGKIYwhjjIMIY4yADISMpAykjKeMg4yDjIOMgwiDCIMMg4yDDIMIgohjCGMIYohjCGOMgQQhBCIIQohjDIMIYwhjCGMMg4yADISQpRDGFOYU5hTmFOYU5ZTGFOWQxZDFEMWQxZDFkMWQxhTlEMWQxZDGFOUEIQQiCEKIYwyDCGMIYwhjDIOMgAyEkKUQxhTmFOYU5hTmFOWUxhTlkMWQxRDFkMWQxZDFkMYU5RDFkMWQxhTlBCEEIghCiGMMgwhjCGMIYwyDjIAMhJClEMYU5hTmFOYU5hTllMYU5ZDFkMUQxZDFkMWQxZDGFOUQxZDFkMYU5QQhBCIIQohjDIMIYwhjCGMMg4yADISQpRDGFOYU5hTmFOYU5ZTGFOWQxZDFEMWQxZDFkMWQxhTlEMWQxZDGFOUEIQQiCEKIYwyDCGMIYwhjDIOMgAyEkKUQxhTmFOYU5hTmFOWUxhTlkMWQxRDFkMWQxZDFkMYU5RDFkMWQxhTmCEMIYAyEDKQMh4yDCGMMgwiDCGOMgAyHjIOMg4yADKSQpJCkDKSQpAykDIeMg4yDCGAMhIykkKQMpRDFEMSQpghDCGAMhAykDIeMgwhjDIMIgwhjjIAMh4yDjIOMgAykkKSQpAykkKQMpAyHjIOMgwhgDISMpJCkDKUQxRDEkKYIQwhgDIQMpAyHjIMIYwyDCIMIY4yADIeMg4yDjIAMpJCkkKQMpJCkDKQMh4yDjIMIYAyEjKSQpAylEMUQxJCmCEMIYAyEDKQMh4yDCGMMgwiDCGOMgAyHjIOMg4yADKSQpJCkDKSQpAykDIeMg4yDCGAMhIykkKQMpRDFEMSQpghDCGAMhAykDIeMgwhjDIMIgwhjjIAMh4yDjIOMgAykkKSQpAykkKQMpAyHjIOMgwhgDISMpJCkDKUQxRDEkKYIQwhgDIQMpAyHjIMIYwyDCIMIY4yADIeMg4yDjIAMpJCkkKQMpJCkDKQMh4yDjIMIYAyEjKSQpAylEMUQxJCnDGAMhAykkKQMhJCkDKeMg4yDjIMIYwhjCGMMgwiDjIKIYwhjjIOMgohjDIKIYwhjjIOMgghBhEGEQgRCCEKIYwxgDIQMpJCkDISQpAynjIOMg4yDCGMIYwhjDIMIg4yCiGMIY4yDjIKIYwyCiGMIY4yDjIIIQYRBhEIEQghCiGMMYAyEDKSQpAyEkKQMp4yDjIOMgwhjCGMIYwyDCIOMgohjCGOMg4yCiGMMgohjCGOMg4yCCEGEQYRCBEIIQohjDGAMhAykkKQMhJCkDKeMg4yDjIMIYwhjCGMMgwiDjIKIYwhjjIOMgohjDIKIYwhjjIOMgghBhEGEQgRCCEKIYwxgDIQMpJCkDISQpAynjIOMg4yDCGMIYwhjDIMIg4yCiGMIY4yDjIKIYwyCiGMIY4yDjIIIQYRBhEIEQghCiGMMYAyEDKSQpAyEkKQMp4yDjIOMgwhjCGMIYwyDCIOMgohjCGOMg4yCiGMMgohjCGOMg4yCCEGEQYRCBEIIQohgDISQpJCkkKQMpAynjIMIYghCiGKIYwhiFOUdaJ1LGQUQxhTnmSeZB5kEGSqVB5kmIWmdaAylBCGEQghBBCIIYAyEkKSQpJCkDKQMp4yDCGIIQohiiGMIYhTlHWidSxkFEMYU55knmQeZBBkqlQeZJiFpnWgMpQQhhEIIQQQiCGAMhJCkkKSQpAykDKeMgwhiCEKIYohjCGIU5R1onUsZBRDGFOeZJ5kHmQQZKpUHmSYhaZ1oDKUEIYRCCEEEIghgDISQpJCkkKQMpAynjIMIYghCiGKIYwhiFOUdaJ1LGQUQxhTnmSeZB5kEGSqVB5kmIWmdaAylBCGEQghBBCIIYAyEkKSQpJCkDKQMp4yDCGIIQohiiGMIYhTlHWidSxkFEMYU55knmQeZBBkqlQeZJiFpnWgMpQQhhEIIQQQiCGAMhJCkkKSQpAykDKeMgwhiCEKIYohjCGIU5R1onUsZBRDGFOeZJ5kHmQQZKpUHmSYhaZ1oDKUEIYRCCEEEIghgkKSQpJClEMUQpAymCEGEIQQhBCCAIYRDFQchiR1onUqVBxUEGSidSR1JnWidSZ1rIaqhiIylhEIIYghiBEIIYJCkkKSQpRDFEKQMpghBhCEEIQQggCGEQxUHIYkdaJ1KlQcVBBkonUkdSZ1onUmdayGqoYiMpYRCCGIIYgRCCGCQpJCkkKUQxRCkDKYIQYQhBCEEIIAhhEMVByGJHWidSpUHFQQZKJ1JHUmdaJ1JnWshqqGIjKWEQghiCGIEQghgkKSQpJClEMUQpAymCEGEIQQhBCCAIYRDFQchiR1onUqVBxUEGSidSR1JnWidSZ1rIaqhiIylhEIIYghiBEIIYJCkkKSQpRDFEKQMpghBhCEEIQQggCGEQxUHIYkdaJ1KlQcVBBkonUkdSZ1onUmdayGqoYiMpYRCCGIIYgRCCGEQxJCkkKSQpAyHjIMIYwhjjIAMp4yBEMSZSZ1oGSgZK5kmlQcVBJlLGSQZKJlJHWkdaJ1KEOWQxghhhEKIYohhEMSQpJCkkKQMh4yDCGMIY4yADKeMgRDEmUmdaBkoGSuZJpUHFQSZSxkkGSiZSR1pHWidShDlkMYIYYRCiGKIYRDEkKSQpJCkDIeMgwhjCGOMgAynjIEQxJlJnWgZKBkrmSaVBxUEmUsZJBkomUkdaR1onUoQ5ZDGCGGEQohiiGEQxJCkkKSQpAyHjIMIYwhjjIAMp4yBEMSZSZ1oGSgZK5kmlQcVBJlLGSQZKJlJHWkdaJ1KEOWQxghhhEKIYohhEMSQpJCkkKQMh4yDCGMIY4yADKeMgRDEmUmdaBkoGSuZJpUHFQSZSxkkGSiZSR1pHWidShDlkMYIYYRCiGKIYRDEkKSQpJCkDIeMgwhjCGOMgAynjIEQxJlJnWgZKBkrmSaVBxUEmUsZJBkomUkdaR1onUoQ5ZDGCGGEQohiiGA==",
    brass: "AkECggKC4/ti82HzYfPC+0P8Y/xj/OT8Y/yD/IP8pPzl/KPzo/ND/GP8pPyk/ATLoUjCOMI4wTDhSCJBIkGBIAJBommiaQPLYvNh82HzwvtD/GP8Y/zk/GP8g/yD/KT85fwj/CP8g/xj/KT8pPwEy6FIwjjCOMEw4UgiQSJBgSACQaJpomkDywLTQttC28L7Q/xj/GP85Pxj/IP8g/yk/OX8I/wj/IP84vvj++P7BMuhSMI4wjjBMOFIIkEiQYEgAkGiaaJpA8sC00LbQtsi06Pjw+Nj/OT8Y/yD/IP8pPzl/CP8I/yD/OL74/vj+6Tzw8qkmsI4wTDhSCJBIkGBIAJBommiaQPLAtNC20LbItOj48Pjw+Pj68Prg/yD/KT85fwj/CP8g/zi++P74/uk88PKpJqkmiJJwTAiQSJBgSACQaJpomkDywLTQttC2yLTo+PD48Pj4+vD66Pjo+Ok/OX8I/wj/IP84vvj++P7pPPDyqSapJoiScEwIjmiKIEgg1GDWaJpA8sC00LbQtsi06Pjw+PD4+Prw+uj46Pjo+PE48TjI/yD/OL74/vj+6Tzw8qkmiJJIknBMCI5oiiiKINRg1mDWaNpomlC20LbItOj48Pjw+Pj68Pro+Oj46PjxOPE48TjBOyk4+P7pPOk88PKpJoiSSJJwTAiOaIooiiDUYNZg1mjaaJpw3HDcaNxo+PD48Pj4+vD66Pjo+Oj48TjxOPE4wTspOOk4yPbI9vDyqSaIkkiScEwIjmiKKIog1GDWYNZo2miacNxw3GjccN5o3GjcePrw+uj46Pjo+PE48TjBOwE7KTjpOMj2yPbQ9uF04NpIknBMCI5oiiiKINRg1mDWaNpomnDccNxo3HDeaNxo3GjeaJ5o+Oj46PjxOPE4wTsBOyk46TjI9sj20PbhdODaYNpgSAiOaIooiiDUYNZg1mjaaJpw3HDcaNxw3mjcaNxo3mieaJ5onGiccTjxOME7ATspOOk4yPbI9tD24XTg2mDaYEgoSiCIIIgo1mjWaNZo2miacNxw3GjccN5o3GjcaN5onmieaJxonGjcaN5w3kE7KTjpOMj2yPbQ9uF04Npg2mBIKEogiCCIKNZo1mjWaRZg1GDUcNxo3HDeaNxo3GjeaJ5onmicaJxo3GjecN5w3nDceNxI9sj20PbhdODaYNpgSChKIIggiCjWaNZo1mkWYNRg1GDUWRJZEmjcaNxo3mieaJ5onGicaNxo3nDecN5w3HjcWJpYmmCaYXTg2mDaYEgoSiCIIIgo1mjWaNZpFmDUYNRg1FkSWRJQ0FDQaN5onmieaJxonGjcaN5w3nDecNx43FiaWJpgmnDcUNZg2mBIKEogiChIKNZo1mjWaRZg1GDUYNRZElkSUNBQ0FDQUNBQ0GicaJxo3GjecN5w3nDceNxYmliaYJpw3FDWUNZwjDBKIIgoSBjSaNZo1mkWYNRg1GDUWRJZElDQUNBQ0FDQUNBQ0lDSUNJo3nDecN5w3HjcWJpYmmCacNxQ1nCMMIwwSihIKEgY0mDSYNJg1GDUYNRg1FkSWRJQ0FDQUNBQ0FDQUNJQ0lDSUNJQ0lDScNx43FiaWJpgmnDcUNZwjDCMMEooSChIGNJg0mDSYNRY0mDSYNJZElkSUNBQ0FDQUNBQ0FDSUNJQ0lDSUNJQ0lDSWNJhEliaYJpw3FDWcIwwjDBKKEgoSBjSYNJg0mDUWNJg0mDSUNJQ0lDQUNBQ0FDQUNBQ0lDSUNJQ0lDSUNJQ0ljSYRJhEmEScNxQ1nCMMIwwSihIKEgY0mDSYNJg1FjSYNJg0lDSUNJQ0FDQUNBQ0FDQUNJQ0lDSUNJQ0lDSUNJY0mESYRJhElDSWNRY0nCMMEooSChIGNJg0mDSYNRY0mDSYNJQ0lDSUNBQ0FDQUNBQ0FjSUNJQ0lDSUNJQ0lDSWNJhEmESYRJQ0ljUWNJY0lCQQIxoSBDOQIxg0mDUWNJg0mDSUNJQ0lDQUNBQ0FDQUNBY0ljSWNJY0lDSUNJQ0ljSYRJhEmESUNJY1FjSWNJQkECMQI5QzkCMQIxAjHiMINJg0lDSUNJQ0FDQUNBQ0FDQWNJY0ljSWNJY0ljSWNJY0mESYRJhElDSWNRY0ljSUJBAjECOUM5AjECMQIx4jDiMOIoQ0lDSUNBQ0FDQUNBQ0FjSWNJY0ljSWNJY0ljSYNJg0mESYRJQ0ljUWNJY0lCQQIxAjlDOQIxAjECMeIw4jDiKOIo4ijCKENBQ0FDQUNBY0ljSWNJY0ljSWNJY0mDSYNJg0mDSWNJY1FjSWNJQkECMQI5QzkCMQIxAjHiMOIw4ijiKOIowijCKMIowihDQWNJY0ljSWNJY0ljSWNJg0mDSYNJg0ljSYNJYkFiQUJBAjECOUM5AjECMQIx4jDiMOIo4ijiKMIowijCKMIowijCKMIoY0ljSWNJY0ljSYNJg0mDSYNJY0mDSWJBQkFCQUI5Y0GiIKIYohgCMeIw4jDiKOIo4ijCKMIowijCKMIowijCKMIo4ijiMGNJY0mDSYNJg0mDSWNJg0liQUJBQkFCOWNBoiCiGKIYohiiIOIw4ijiKOIowijCKMIowijCKMIowijCKOIo4jDiMOIwg0mDSYNJg0ljSYNJYkFCQUJBQjljQaIgohiiGKIYoiDCIMIgwiDiKMIowijCKMIowijCKMIowijiKOIw4jDiMOIwAjECMYNJY0mDSWJBQkFCQUI5Y0GiIKIYohiiGKIgwiDCIMIgwiDCIKIgwijCKMIowijCKMIo4ijiMOIw4jDiMAIxAjECMQIxAjFiQUJBQkFCOWNBoiCiGKIYohiiIMIgwiDCIMIgwiCiIKIgoiCiIMIowijCKOIo4jDiMOIw4jACMQIxAjECMQIx4ijiKOIoQjljQQIxohiiGKIYoiDCIMIgwiDCIMIgoiCiIKIgoiCiIKIgoiDiKOIw4jDiMOIwAjECMQIxAjECMeIo4ijiKOIo4igCMeIw4jCiGKIgwiDCIMIgwiDCIKIgoiCiIKIgoiCiIKIgoSDCKOIw4jDiMAIxAjECMQIxAjHiKOIo4ijiKOIoAjHiMOIwAjHBKMEgwiDCIMIgwiCiIKIgoiCiIKIgoiCiIKEgwijBKMEowigCMQIxAjECMQIx4ijiKOIo4ijiKAIx4jDiMAIxwSjBIMIowijiKMIgoiCiIKIgoiCiIKIgoiChIMIowSjBKMIowijiKMIgAjECMeIo4ijiKOIo4igCMeIw4jACMcEowSDCKMIo4ijiKOIo4iiiIKIgoiCiIKIgoSDCKMEowSjCKMIo4ijCIMIgoiChGOIo4ijiKOIoAjHiMOIwAjHBKMEgwijCKOIo4ijiKOIo4ijiKOIooiCiIKEgwijBKMIowijCKOIowiDCIKIgoRihGIEYgRjiKA==",
    glass: "R9xH3EfcR9xH3GfkaORo5GjkiOSI5KjkiOSo5KnkqeSp5KnkqeSp5KjkqOSo5KjkiOSo5IjkZ9xH3EfcR9xH3EfcR9xH3EfcaNxo5GjkaOSI5IjkqOSo5KnkqeSp5MnkyeTJ5MnkyeTJ5MnkqeSo5KjkqOSo5GjcZ9xH3EfcR9xH3EfcR9xI3GjkaOSI5IjkiOSo5KnkyeTJ5MnkyeTJ5MnkyeTJ5MnkyeTJ5MnkqeSo5KjkqORo5GjcZ9xn5EfcR9xH3EjcaORo5IjkiOSI5KjkqeTJ5MnkyeTJ5Mnk6eTp5Onk6eTp5Ons6ezJ5MnkyeTJ5KjkiORo5GfcZ+RH3EfcaORo3GjkiOSI5KjkqOSp5MnkyeTp5Onk6uTq5OrkCuUK5erk6uTq7Ons6eTJ5MnkyeTJ5IjkiORo5GjkZ+Ro3GjkaORo5IjkiOSp5KnkyeTJ5Onk6eTq5ArlCuUK7QrtCu0K7QrtCu0K7ers6eTp5OnkyeSo5IjkiORo5GjkaORo5GjkiOSI5KnkqeTJ5Mnk6eTq7ArtCu0K7QrtKu0q7SrtKu0q7SrtCu0K7ers6eTp5OnkqOSI5IjkiORo5GjkaOSI5IjkqeSp5MnkyeTp5OrkCu0K7SrtKu0r7SvtS+1L7SvtK+0q7Ur1Ku0q7Qrt6ezJ7MnsqOyo7Mj0yPRo5IjkiOSJ5KnkyeTJ5Onk6uQK7SrtSvVL9Uv1a/Vr9Wv1a/Vr9Wv1a/VL9UrtKu0K7ens6ezJ7Mns6fTp9Mj0aOSI5IjkyPTp9An1CfUp9Sr1SvVK9Wv1S/Vr9Wv1a/WL9Yv1i/WL9Wv1a/VL9UrtCu0K7ens6ezJ7On06fTI9Kj0yPSo9Mn0CfUJ9Sr1KvVK9Ur1a/Vr9Wv1a/WM9Yz1jPWs9Yz1jPWL9Yv1a/VL9SrtCu0K7ensyewJ9en06fTI9Mj0yPTJ9An1CfUq9Ur1SvVr9Wv1i/WL9Yz1rPWs9az1rPWs9az1rPWM9Wv1a/Uq7SrtCu3p7OnsCfXp9On0yPTI9Mj06fQJ9Sr1KvVK9Wr1a/WL9az1jPWs9az1zPXM9cz1zPXM9az1rPWL9Wv1S+0q7QrtCu3p7An1CfXp9Mj06fTJ9On0CfUq9Ur1SvVr9Yv1jPWs9az1rPXN9c317fXt9e31zfXM9az1jPWL9UvtS+0q7Qrt6ewK9Qn1yezI9On0yfTp9Cn1KvVK9Wv1a/WL9az1zPXM9c317fXt9e31Dfbt9e31zfXM9az1jPWL9WvtSu0q7QrtCu3p7OnsyPTp9On06fQq9Ur1SvVr9Yv1rPWs9cz1zfXt9Q32DvYO9g72DvYN9u317fXM9az1i/Vr9WvtKu0K7Qrt6ezp7Mj0yfTp9An1KvVK9Wv1a/WL9az1zPXt9e31DfYu9i72LvYu9g72DvYN9u31zfXM9Yz1i/Vr7SrtKu0K7Qrt6ezp9Mn06fQJ9Sr1SvVr9Yv1q/XM9cz17fUN9i72TvZP/k/+TvYu9i72DvYN9u31zPWs9Yv1a/VK7SrtKu0K7ens6fTJ9On0CfUq9Ur1a/WL9az1zPXt9Q32DvYu9k/+b/5v/k/2T/ZO9i72Dfbt9cz1rPWL9Wv1S+0q7SrtCu3p7On0yfQJ9Sr1SvVK9Wv1i/Ws9cz17fUN9i72TvZv/o/+j/5v9m/2T/Yu9g727fXt9az1jPVr9UvtKu0q7Qrt6ewJ9Qn1KfUq9Ur1avWL9Yv1rPXM9e31DvYu9k/+b/6Q/rD+kP5v/m/2TvYu9g327fWs9az1i/VL7SrtKu1pzEnMCfUJ9Sn1KvVK9Wr1i/Wr9az1zPXt9Q72LvZv/o/+sP6w/rD+kP5v/k72LvYN9u31zPWs9Yv1S+0q5YrMacxJzAn1CfUp9Sr1SvVq9Yv1q/XM9c31DfYO9k72b/6Q/rD+0f6w/pD+b/5P9i727fXN9cz1rPWL9UvtKuWKzGnMScwJ9Qn1KfUq9Ur1avWL9av1rPXN9Q32DvZO9m/+kP6w/tH+sP6Q/m/+TvYu9u31zfXM9az1i/VL7SrlisxpzEnMCfUJ9Sn1KvVK9Wr1i/WL9az1zPXt9Q72LvZP/o/+kP6w/rD+j/5v/k72Lvbt9c31zPWs9Yv1S+0q5YrMacxJzAn1CfUp9Sr1SvVq9Wv1i/Ws9cz17fUO9i72T/5v/o/+kP6Q/m/+T/Yu9g727fXM9cz1rPWL9UvtKuWKzGnMScwJ9Qn1CfUp9Ur1SvVr9Yv1rPXt/Q3+DfYu9k7+T/Zv/m/+b/Zv9k72LvYO9s31rPXM9az1i/Ur7QrlicxpzEnMCfUJ9Qn1KfUq9Ur1i/WL9az17P0N/g32DvYu9k72T/ZP9k/2TvYu9g72DfbN9az1rPWs9Yv1K+0K5UnEKbwJvAn1CfUJ9QntKvUq9Wv1i/Wr9ez97f3t9Q32LvYu9i72TvYu9i72LvYN9u31zPWs9az1i/WL9SvlCuVJxCm8CLwJ9Qn1KfUJ7QrtKvVq9Yv1q/XM/ez97fXt9Q32DvYu9i72LvYO9g327fXt9az1rPWs9az1i/Ur5QrdSbwpvAi8CfUJ9Sn16ewJ7Sr1avWL9av1zP3M/cz17fXt9Q32DfYN9g32Dfbt9Q327fXM9az1rPWL9Yv1KuUK3Um8KbwIvAn1CfUJ9ensCe0q9Ur1a/Wr9az9zP3M9cz17fXt9e317fUN9g32Dfbt9ez1rPWs9az1i/Vr9QrlCt0pvAm86Lvo9An1CfXp7AntCe1K9Wr1i/Wr9cz9rPXM9cz1zPXt9e317fXt9e317PWs9az1i/WL9Yv1a/UK3ercKbwIvOiz6PTo9An16ezp7AntSvVK9Yv1q/Wr9az1zPXs9cz17PXs9ez1zPXM9cz1rPWL9Yv1i/Vr9WvtCt3q3Cm8CLzos+j06PQJ9cjs6ewJ7Sr1SvWL9Yv17P2s9cz1zPXM9cz1zPXM9cz1zPWs9Yv1i/Vr9Yv1a+1K7erc6dzos+izyKvo9Oj06fTI7Ons6ewp9Ur1y/3L/cv9q/Ws9cz1rPWs9az1rPWs9az1q/WL9Wv1a/Vr9Wrta+2JxGnE6LPIs6iryPTo9Oj0yOzI7OnsavWK9av9y/3L/Yv1q/WL9av1q/Wr9av1q/Wr9Yv1a/Vr9Ur1a+1r7UrtacRJxOizyKuoq8j06PTo9Kjs6exJ9Wr1avWr/av9y/2L9Yv1i/WL9Yv1i/WL9Yv1i/WL9av1q/Wr9WvtS+1K7WnESMTIs6irp6vI9Mj06PTI7OjsSfVp9Wr1qv2r/av9i/WL9Wv1a/WL9Yv1i/WL9Yv1i/Wr9av1i/VL7UrtSu1IxEjEyKuoq4eryPTo9Oj0yOzo7En1SfVp9Yr9qv2q/Wr1avVq9Wr1avVq9Wr1SvVq9Wr1q/WL9Yv1Su1K7SrtSMQoxKirp6uHqw==",
    stone: "4iDiIOMgAynjIOIg4yADKeMoAynjIAMpAykjKSMpAykDKQMpAynjIOMg4yADKeMoAykDKQMpAykDKQMpAykDKeIg4iDjIAMp4yADKQMpAykDKQMpAykDKSMpAynjIAMpAykDKQMp4yDjIOMg4yjjKAMpAykDKQMpAykDKQMpAyniIOIg4yADKeMgAykDKQMpAykDKQMpAykjKQMp4yDjIOMg4yDjIOMgAynjKAMpAykDKQMpAykDKQMpAykDKQMpwiDCIMIg4yDjIAMpAykDKQMpAykDKQMpIykDKeMg4yDjIOMg4yDjIOMg4ygDKQMp4yDjIOMg4yDjIAMp4yDjIMIgwiDCIOMg4iDjIOMg4yDjIOMgAynjIOMgAynjIOMg4yDjIOMgAynjIOMoAykDKeMg4yDjIOMg4yADKeMg4yDCIMIgwiDjIOIg4yDjIOMg4yDjIAMp4yDjIOMg4iDjIOMgwiDCIMIgwiDjIAMpAynjIOMg4yDjIOMgAynjIAMhwiCiGKIY4yDjIOMg4yDjIOMg4yADKeMg4yDjIOIg4yDjIMIgwiDCIMIg4yDiIOIg4yDjIOMg4iDjIOMg4yADIcIgohiiGMIg4yDjIOMo4yDjIOMg4yDjIOMg4yDiIOMgwiDCIMIgwiDCIOMg4iDiIOMg4yDjIOIg4yDjIOMg4yDCIKIYohjCIOMg4yDjKOMg4yDjIOMg4yDjIOIg4yADIeMg4yDiIOMgwiDjIOIg4iDjIOMg4yDiIOMg4yDjIOMg4iDCIKIYwiDjIOMg4yjjIOMg4yDjIOMg4yDiIOMg4yDjIOMg4iDjIOMg4yDiIOMg4iDCIKIYohjjIOMg4yDjIOIgwiDCIOMgIykjKSMpAykDKQMp4yDjIOMg4iADIeMg4yDjIOIg4yDjIOMg4iDjIOIgwiCiGKIYwhiiGKIYwhjiIMIgwiDjICMpIykjKQMpAykDKQMp4yDjIOMgAykjKQMpAyniIOMg4yDjIOIg4yDiIKIYohiiGMIYohiiGMIYwiDCIMIg4yAjKSMpIykDKQMpAykDKeMg4yADKQMpIykDKQMpAykDKQMp4yjjKAMpwiCiGKIYohjCGKIYohjCGMIgwiDCIOMgAykDKeMg4yDiIAMpAynjIOMgAykDKSMpAykDKQMpAykDKeMo4yjjIMIgohiiGKIYwhjCGKIYwhjCIMIgwiDjIAMpAynjIOMg4iDiIOMgwiDjIOMgAykDKQMpAykDKQMpAynjKAMp4yDCIKIYohiiGMIYwhiiGMIY4yDCIMIg4yADKQMp4yDjIOIg4iDjIOMg4yDjIAMpAykDKQMp4yDjIAMpAynjIOMowiCiGKIYohjCGMIYohjCIOMg4iDCIOMg4yDiIOIg4yDiIOIg4yDjIOMg4yADKQMpAykDKeMg4yADKQMp4yDjKOIgohiiGKIYohiiGMIYwiDjIOIgwiDjIOMg4iDiIOMg4yDjIOMg4yADKSMpAykDKQMpAynjIOMgAykDKeMg4yjiIKIYohiiGKIYohjCGMIY4yDiIMIg4yDjIOIg4iDjIOMg4yDjIOMgAykjKQMpAykDKeMgAykDKeMg4yjjIOMo4iCiGKIYohiiGMIYwhjCGMIg4iDiIOMgIykjMSMx4yDjIOMg4yDjIAMpIykDKQMpAynjIAMpAynjIOMoAykDKeMgwiDCGMIg4iDCGMIYwhjCIOIg4iDjICMpIzEjMSMpIykDKSMpIykjKSMpAykDKQMp4yADKQMp4yDjKAMpAynjIMIgwhjCIOIgwiDiIOMgwiDiIOIg4yAjKSMxIzEjKSMpAykjKSMpIykjKQMpAynjKAMpAykDKQMp4ygDKQMp4yDCIMIgwiDiIMIg4iDjIOMg4yDiIAMpRDFkMSMxIykDKQMpIykjKSMpIykDKQMp4ygDKQMpAykDKQMpAykDKQMpAykDKcIg4iDCIOIg4yDjIOMg4iADKUQxZDFEMUQxQzEjMSMxIykDKSMpAykDKQMpAykDKQMpAykDKQMpAykDKQMpAykjKQMpAykDKQMp4yDjIOIgAylEMWQxRDFEMUMxIzEjMSMpAykDKQMpAykjKSMpIykDKQMpAykDKQMpAykDKQMpIykDKQMpAykDKQMp4yDjIAMpIzEjMUQxRDFDMSMxIzEjKQMpAykDKSMpIykjKSMpIykjMSMpIzEDKSMpAykDKSMpAykDKQMpAykDKeMg4yADKSMxIzEjMSMxIykDKQMp4ygDKQMpAykjKSMpIykjKSMpIzEjKSMxAykjKQMpAykDKQMpAykDKSMpAynjIOMgAykjMSMxIzEjMSMpAykDKeMo4yDjKAMpAykDKQMpIykjKSMxIykjKQMpIykDKQMpAykDKQMpIykDKUQxRDFEMUMxIzEjMSMxIzEjKQMpAynjKOMg4ygDKQMpAykDKQMpAykjKQMpAykDKSMpAykDKQMpAykDKSMpAylEMUQxRDFDMSMxIzEjMSMxIzEjMSMx4yjjIAMpAykDKQMpAykDKQMpIykDKQMpAykDKQMpAynjKAMpAykjKQMpRDFEMUQxQzEjMSMxIzEjMSMxIzEjMQMpIykDKSMpAykDKQMpAykDKQMpAykDKQMpAykDKQMp4ygDKQMpAynjKGQ5RDFDMSMxIzFDMSMxIzEjMSMxIzEDKSMpAykjKQMpAykDKQMpAykDKQMpAykDKQMpAykDKQMpAykDKQMp4yhkOUQxQzEjMUMxQzEjMUMxIzEjMSMxAykjKQMpIykDKQMpAykDKSMpAykDKQMpIykjKSMpIykDKQMpAykDKeMoZDlEMUMxIzFDMUMxIzFDMSMxIzFDMUQxQzEjMSMxAykDKQMpAykjKQMpAykDKSMpIykjKSMpAykDKQMpAykDKQMpAykDKQMpQzFDMSMxQzEjMSMxQzFEMUMxIzEjMUMxQzEjMUQxQzFDMQMpAykjKSMpIykjKQMpAykDKQMpAykDKQMpAykDKQMpAykDKQMpAykjMUMxRDFDMSMxIzFDMUMxIzFEMUMxQzFDMSMxIzEjMSMxIykDKQMpAykDKQMpAykDKQMpAykDKQMpAykDKQMpAykDKQMpAykDKSMxQzFDMUMxRDFDMUMxQzEjMSMxIzEjMSMxIzEjMSMxIykjKaIYwiDCIAMpAykDKQMpAykDKQMpAykDKQMpAykjKQMpAykjKSMpIylDMUMxIzEjMSMxIzEjMSMxIzEjMSMpAymiGMIgwiDCIMIgwiDCIOIgAykDKQMpAykDKQMpIykDKQMpIykjKSMpAykDKQMpAykDKSMxIzEjMSMxIzEjKQMpohjCIMIgwiDCIMIgwiDiIOIg4iDiIOIg4iADKSMpAykjKSMpIykjKQMpAykDKQMpAykDKQMpAynjKOMoIykDKQ==",
    rim: "ohhDQQI5AjkjOWNJQkGjWcNho1nDYSRyw2EDeuNx4jBiUSJBIkECQUJJQ4IDeuNxA2oEagRy42nDWSN6I3ojeqIYQ0ECOQI5IzljSUJBo1nDYaNZw2EkcsNhA3rjceIwYlEiQSJBAkFCSUOCA3rCccJxI3pDgmOCI3ojeiN6I3qiGENBAjkCOSM5Y0lCQaNZw2GjWcNhJHLDYQN643HiMGJRIklCSSJJAUHjccJpwnHCcSN6Q4JjgiN6I3ojeiN6ohhDQQI5AjljSWNJQkGjWcNho1nDYSN6I3okeoJZAjlCSSJJQkkiSQFB43HCacJxwnEDckOCY4IjeiN6I3ojeqIYQ0ECOQI5Y0ljSaJhA3IjegN6A3IjeiN6JHqCWQI5QkkiSUJJIkkBQeNxwmnCccJxA3JDgmOCI3ojeiN6I3qiGARq42mjWcNhw2miYQNyI3oDegNyI3ojeiR6glkCOUJJIklCSSJJAUHjccJpwnHCcQNyQ4JjgiN6wmnicaJhgRgEauNpo1nDYcNpomEDciN6A3oDciN6I3okeoJZAjlCSSJJQkkiSQFB43HCaaJp4nHjcQNyA3LDacJp4nGiYYEYBGrjaaNZw2HDaaJhA3IjegN6A3IjeiN6JHqCWQI5QkkiSUJJIklCSaJpwmkDcuJx43EDcgNy42nCaeJxomGBGARq42mjWcNhw2miYQNyI3oDegNyI3ojeiR6YlECOQFBAUFCSSJJQkmiacJpA3LiceNxA3IDcuNpwmnicaJhgRgEauNpo1nDYcNpomEDciN6glmCWYJZgmGjYWJRAjkBQQFBQkkiSUJJomnCaQNy4nHjcQNyA3LjacJp4nGiYYEYBGrjaaNZQklCUWJRglmCWYJZglmCWYJho2FiUQI5AUEBQUJJIklCSSJBwmkDcuJx43HDaQNy42mjYYNZQkmBGMNpo2FiSUJJQlFiUYJZglmCWYJZglmCYaNhYlECOQFBAUFCSSJJQkkiQcJpA3LicQNyg1njacNho2GDWWJRgRjDaaNhYklCSUJRYlGCWYJZglmCWYJZgmGjYWJRAjkBQQFBQkkiSUJJQkliWeJxI3oDcoNZ42nDYaNhg1liUYEYw2mjYWJJQklCUWJRglmCWYJZglmCWYJho2FiUaEoQkkiQQE5AUFCSUJJYlnicSN6A3KDWeNpw2GCWYNZYlGBGMNpo2FiSUJJQlFiUYJZglmCWYJZIkkiSYNRQlGhKEJJIkEBOQFBQklCSWJZ4nECegNyg1njacNhglmDWWJRgRjDaaNhYklCSUJRYlEiQSJBQkljUSJJIkmDUUJRoShCSSJBATlCSUJJQkliWeJxAnoDcoNZ42nDYYJZw2GjWYEYw2mjYQI5AjkCOQJBIkEiQUJJY1EiSSJJg1FCUaEoQkkiQQE5QklCSUJJYlnicQJ6A3KjYUN6A3LDacNho1mBGKJhg1ECOQI5AjkCQSJBIkFCSWNRIkkiSYNRAUmhKEJJIkEBOUJJQkmCUSFB4nFDegNyo2EjegNyw2nDYaNZgRiiYYNRAjkCOQI5AkEiQSJBQkljUSJJIkmDUQFJoShCSSJBAjkCQWJJglEhQeJxQ3oDcqNhI3oDcsNpw2GjWYEYomGDUQI5AjkCOQJBIkEiQUJJY1EiSSJJAkECOYEgAjkiQQI5AkFiSYJRhILicUN6A3KjYSN6A3LDaQNqo1mBGKJhg1ECOQI5AjkCQSJBIkFCSUJJQklCSQJBAjmBIAI5IkECOQJBYkmCUYSC4nFDegNyo2EjegNyw2kCcuNpgRiiYYNRAjkCOSJBIkFjSUJJQklCSUJJQkkCQQI5gSACOSJBAjkCQWJJglGEguJxQ3oDeiN6I4IjgiN6AnLjaYEYQkkiQQJBIkEiQSJBY0lCSUJJQklCSUJJAkECOYEgAjkiQQI5AkFiSYJRQkEjekOCI3ojeiOCI4IjegJy42mhIEJJIkECQSJBIkEiQWNJQklCSUJJQklCSQJBAjmBIAI5IkHhOAJBIkGhKEJBI3pDgiN6I3ojgkOCI3oCcuNpoSBCSSJBAkEiQSJBIkFjSUJJQklCSUJJQkkCQaEoQRDCMOE44TgCQSJBoShCQSN6Q4IjeiN6I4JDgiN6AnIjeqEgQkkiQQJBIkEiQSJBY0lCSUJJQklCQUJBY0mhKEEQwjDhOOE4AkGCUaEoQkEjekOCI3ojeiOCQ4IjeqSSo4qhIEJJIkECQSJBIkEiQUJJQkFCSSJBQkFCQWNJoShBEMIw4TjhOAJBglGhKEJBgllDgiN642kkckN6xJKkkqOKoSBCSSJBAkEiQSJBQklCSUJBQkkiQUJBQkFjSaEoQRDCMOE44TgCQYJRoShCQSI5o1mjWeNpJHJDesSSpJKjiqEgQklDSSJBIkEiQUJJQklCQUJJIkFCQUJBY0mhKEEQwjDhOOE4IkEiQUEIQRAiOaNZo1nDYSRyQ3qkiqSSo4qhIEJJQ0kiQSJBIkFCSUJJQkFCSSJBQkFCQWNJoShBCMIoIkFCQSJBIkFBCEEQIjmjWaNZw2EkckN6pIqkkqOKoSBCSUNJIkEiQSJBQklCSUJBQkkiQUJBwiACKYEYQQjCKCJBQkEiQSJBQQhBECI5o1mjWcNhJHJDeqSKYkmDSaEgQklDSSJBIkEiQUJJQklCQcIgwijCIMIgAimBGEEIwigiQUJBIkEiQUEIQRAiOaNZo1nDYaIgoiACMWJJg0mhIEJJQ0kiQSJBIkFCQSM54ijCIMIowiDCIAIpgRhBCMIoIkFCQSJBIkFBCEEQQQhhEIIYohiiIKIgAjFiSYNJoShCSUJJQkFDQUNBQ0kjOeIo4ijCKMIgoiACKYEYQQjCKCJBAkEiQWEQQQhBCEEIYRCCGKIYoiCiIAIxQkGDSeIoYlFCSUJBQ0FDQUNJIzniKOIowijCIKIgAimBGEEIwiihKMEooiBhEEEIQQhBCGEQghiiGKIgoiACMUJBg0niKGJRQklCQUNBQ0FDSSM54ijiKMIowiCiICEIIQhBCGEQoSjBKKIgYRBBCEEIQQhhEIIYohiiIKIgAjGCEIIQ4ihiUUJJQkFDQUNBQ0kjOeIo4iiCEIIYIQAhCCEIQQhhEKEowSiiIGEQQQhBCEEIYRCCGKIYoxiCGIIQghCCEOIoYlFCSUJBQ0FDQUNJohiiGIIYghCCGCEAIQghCEEIYRChKMEooiBhEEEIQQhBCEEIohiiGKMYghiCEIIQghDiKGJRQklCQeIgwijCIKIYohiCGIIQghghACEIIQhBCGEQoSjBKKIgYRBBCEEIIQhBCKIYohijGIIYghCCEIIQ4igCMeIowiDiIMIowiCiGKIYghiCEIIYIQAhCCEIQQhhEKEoghhhEEEIQQhBCCEIQQiiEKIYoxiiEIIQghCCEA=="
  } /* ASCENT_TEXELS_END */;
  const tiles = Object.keys(texels);

  function lanternAtlas() {
    const texture=Z(e0(ctx=>{
      const image=ctx.createImageData(180,44);
      tiles.forEach((key,tile)=>{
        const raw=atob(texels[key]);
        for(let y=0;y<44;y++)for(let x=0;x<36;x++){
          const u=Math.max(0,Math.min(31,x-2)),v=Math.max(0,Math.min(39,y-2));
          const i=(v*32+u)*2,pixel=raw.charCodeAt(i)|raw.charCodeAt(i+1)<<8;
          const j=(y*180+tile*36+x)*4;
          image.data[j]=(pixel>>11)*255/31;
          image.data[j+1]=(pixel>>5&63)*255/63;
          image.data[j+2]=(pixel&31)*255/31;
          image.data[j+3]=255;
        }
      });
      ctx.putImageData(image,0,0);
    },180,44));
    texture.name="hellAscentLanternTiles";
    texture.colorSpace=ha;
    texture.minFilter=YC;
    texture.generateMipmaps=true;
    return texture;
  }

  const lamps = [
    {wall:110,side:1,z:93.14,lift:-.12,light:1,size:1},
    {wall:116,side:-1,z:79.55,lift:.58,light:.86,size:1.13},
    {wall:110,side:1,z:61.5,lift:0,light:.60,size:1}
  ];

  function decorateAscent(scene) {
    const map=lanternAtlas();
    const material=Z(new $e({map,vertexColors:true,toneMapped:false,side:hi}));
    const flame=Z(new $e({map,vertexColors:true,toneMapped:false,side:hi,fog:false}));
    const tracks=new Map();
    const up=new Y(0,1,0),scale=new Y(1,1,1);
    function shape(tile,geometry,transform,brightness=1) {
      const uvs=geometry.getAttribute("uv"),tileX=tiles.indexOf(tile)*36+2.5;
      for(let i=0;i<uvs.count;i++)
        uvs.setXY(i,(tileX+uvs.getX(i)*31)/180,1-(2.5+(1-uvs.getY(i))*39)/44);
      const paint=tile==="glass"?flame:material;
      Yd(tracks,paint,geometry,transform);
      const part=tracks.get(paint).at(-1),normals=part.getAttribute("normal");
      const tint=new Float32Array(normals.count*3);
      for(let i=0;i<normals.count;i++){
        const k=tile==="glass"?brightness:brightness*(.74+.20*Math.max(0,normals.getY(i))+.11*Math.abs(normals.getZ(i)));
        tint.set([k,k*.95,k*.89],i*3);
      }
      part.setAttribute("color",new y0(tint,3));
    }
    function rod(map,tile,from,to,radius,bright) {
      const direction=new Y(to[0]-from[0],to[1]-from[1],to[2]-from[2]), length=direction.length();
      const center=new Y((to[0]+from[0])/2,(to[1]+from[1])/2,(to[2]+from[2])/2);
      const transform=new fe().compose(center,new Pn().setFromUnitVectors(up,direction.normalize()),scale);
      shape(tile,new Eo(radius,radius,length+.012,6),map.clone().multiply(transform),bright);
    }
    for(const lamp of lamps){
      const {wall,side,z,light,lift,size}=lamp, floor=ie(wall+side*.5,z);
      const base=E(wall+side*.033,floor+lift,z,0,side===1?0:Math.PI,0,size);
      const bodyX=.70, crown=1.58;
      const box=(tile,w,h,d,x,y,z,bright=1)=>shape(tile,new Ne(w,h,d),base.clone().multiply(E(x,y,z)),bright);
      const ring=(tile,up,down,height,x,y,bright=1)=>shape(tile,new Eo(up,down,height,4),base.clone().multiply(E(x,y,0,0,Math.PI/4)),bright);

      // Wall plate and the swan-neck forged bracket. The lantern's full
      // weight reaches the masonry through the bent bar and both bolts.
      box("iron",.083,.53,.19,.036,1.57,0,.94);
      box("brass",.024,.46,.224,.05,1.57,0,.58);
      for(const y of [1.405,1.733])box("brass",.026,.065,.077,.094,y,0,1.25);
      const arm=[[.06,1.45,0],[.21,1.50,0],[.32,1.63,0],[.385,1.81,0],
        [.465,1.925,0],[.602,1.947,0],[.697,1.934,0],[.751,1.98,0]];
      arm.slice(1).forEach((end,i)=>{
        rod(base,"iron",arm[i],end,.045-i*.0017,1.30);
        const a=arm[i].map((value,index)=>value+(index===2?.032:0));
        const b=end.map((value,index)=>value+(index===2?.032:0));
        rod(base,"brass",a,b,.012,.72);
      });
      for(let i=0;i<3;i++){
        const localY=1.88-i*.081;
        const link=[[bodyX-.029,localY-.048,0],[bodyX+.029,localY-.048,0],
          [bodyX+.029,localY+.037,0],[bodyX-.029,localY+.037,0]];
        link.forEach((p,j)=>rod(base,"iron",p,link[(j+1)%4],.009,1.12));
      }
      ring("brass",.05,.097,.099,bodyX,crown+.044,.91);
      ring("iron",.078,.247,.165,bodyX,crown-.069,1.25);
      ring("brass",.247,.241,.026,bodyX,crown-.15,1.22);
      ring("brass",.239,.226,.031,bodyX,1.020,1.24);
      ring("iron",.221,.160,.093,bodyX,.968,1.23);
      ring("iron",.079,.047,.051,bodyX,.901,1.06);

      const frameSize=.145;
      const corner=[[-1,-1],[-1,1],[1,1],[1,-1]];
      const point=(pair,y,factor=1)=>[bodyX+pair[0]*frameSize*factor,y,pair[1]*frameSize*factor];
      corner.forEach((a,index)=>{
        const b=corner[(index+1)%4];
        const bottom=1.032, top=1.415, p0=point(a,bottom,.985),p1=point(a,top),p2=point(b,top),p3=point(b,bottom,.985);
        const glassPos=[...p0,...p1,...p2,...p0,...p2,...p3];
        const geometry=new h0();
        geometry.setAttribute("position",new y0(new Float32Array(glassPos),3));
        geometry.setAttribute("uv",new y0(new Float32Array([0,0,0,1,1,1,0,0,1,1,1,0]),2));
        geometry.computeVertexNormals();
        shape("glass",geometry,base, light*(index===1?.92:1));
        rod(base,"iron",point(a,bottom,1.06),point(a,top,1.06),.018,1.10);
        rod(base,"iron",point(a,bottom,1.07),point(b,top,1.07),.0115,1.0);
        rod(base,"iron",point(a,top,1.075),point(b,bottom,1.075),.0115,1.0);
      });
    }

    // Short stone nosings finish the existing risers. Their millimetre-deep
    // skins are sampled from the dark worn step in the reference frame.
    for(const [z,strength] of [[98,.66],[90,1],[82,.76],[74,.56],[66,.53]]){
      const high=ie(113,z-.18), low=ie(113,z+.18);
      if(high<=low)continue;
      const haloX=z>=90?111.50:114.52;
      for(let slab=0;slab<5;slab++){
        const width=1.11+(slab%2)*.056, x=110.63+slab*1.18;
        const tint=strength*(.85+.42*Math.exp(-((x-haloX)**2)/4)+(slab%3)*.04);
        shape("stone",new Ne(width,.082,.015),E(x,high-.053,z+.015),tint);
        shape("stone",new Ne(width,.015,.132),E(x,high+.007,z-.071),tint*.96);
      }
    }

    // Local amber is baked into a slim mapped rim. Reuse the original
    // arch's points so the functional opening remains exactly the same.
    const profile=[[2.71,2.04],[2.49,2.53],[2.05,2.91],[1.41,3.15],[.70,3.27],[0,3.29]];
    const floor=ie(113,87);
    for(const side of [-1,1])for(let i=1;i<profile.length;i++){
      const [a,b]=profile[i-1],[c,d]=profile[i],dx=(c-a)*side,dy=d-b;
      const tint=(side<0?2.17:1.40)*(i===5?.88:1);
      shape("rim",new Ne(.065,Math.hypot(dx,dy)+.014,.023),
        E(113+side*(a+c)/2,floor+(b+d)/2-.121,87.258,0,0,-Math.atan2(dx,dy)),tint);
    }
    for(const [paint,pieces] of tracks){
      const tint=new Float32Array(pieces.reduce((n,g)=>n+g.getAttribute("color").array.length,0));
      let offset=0;
      for(const piece of pieces){const colors=piece.getAttribute("color").array;tint.set(colors,offset);offset+=colors.length;}
      const geometry=Z(BR(pieces));
      geometry.setAttribute("color",new y0(tint,3));
      const assembly=new pt(geometry,paint);
      assembly.name=paint===flame?"hellAscentLanternPanes":"hellAscentLanternAssemblies";
      scene.add(assembly);
    }
  }

  function bakeLanternSpill(scene) {
    const texture=Z(e0((ctx,w,h)=>{
      const pixels=ctx.createImageData(w,h);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const dx=(x+.5-w/2)/(w/2),dy=(y+.5-h/2)/(h/2);
        const grain=((x*17+y*13+x*y*3)%53)/53;
        const falloff=Math.max(0,1-Math.hypot(dx,dy))**1.62;
        const j=(y*w+x)*4;
        pixels.data[j]=251;pixels.data[j+1]=134;pixels.data[j+2]=53;
        pixels.data[j+3]=falloff*(186+38*grain);
      }
      ctx.putImageData(pixels,0,0);
    },64,64));
    texture.name="hellAscentLanternSpill";
    texture.colorSpace=ha;
    const material=Z(new $e({map:texture,side:hi,vertexColors:true,transparent:true,depthWrite:false,
      blending:is,toneMapped:false,opacity:.79}));
    const positions=[],uvs=[],tints=[];
    function quad(points,uv,light) {
      for(const corner of [0,1,2,0,2,3]){
        positions.push(...points[corner]);uvs.push(...uv[corner]);tints.push(light,light,light);
      }
    }
    for(const {wall,side,z,light,lift,size} of lamps) {
      const floor=ie(wall+side*.5,z), wallX=wall+side*.065;
      const minY=floor+lift-.035+1.25*(size-1),maxY=minY+2.84;
      quad([[wallX,minY,z-2.87],[wallX,maxY,z-2.87],
        [wallX,maxY,z+2.87],[wallX,minY,z+2.87]],[[0,0],[0,1],[1,1],[1,0]],light*1.12);
      // Split each ground wash at actual cell breaks. The texture continues
      // across neighboring treads, but every geometry remains on its own floor.
      const centerX=wall+side*1.48, centerZ=z-1.34;
      const xMin=Math.max(110.09,centerX-2.26),xMax=Math.min(115.91,centerX+2.26);
      const xUv=x=>(x-centerX)/4.52+.5, zUv=x=>(x-centerZ)/6.38+.5;
      const start=centerZ-3.19,end=centerZ+3.19;
      for(let z0=start;z0<end;) {
        const edge=(Math.floor((z0+.0001)/2)+1)*2,z1=Math.min(edge,end);
        const y=ie(centerX,(z0+z1)/2)+.029;
        quad([[xMin,y,z0],[xMin,y,z1],[xMax,y,z1],[xMax,y,z0]],
          [[xUv(xMin),zUv(z0)],[xUv(xMin),zUv(z1)],[xUv(xMax),zUv(z1)],[xUv(xMax),zUv(z0)]],light*.92);
        if(z1===edge){
          const high=ie(centerX,z1-.095),low=ie(centerX,z1+.095);
          if(high>low+.03){
            const face=z1+.037;
            quad([[xMin,low+.029,face],[xMin,high-.025,face],[xMax,high-.025,face],[xMax,low+.029,face]],
              [[xUv(xMin),zUv(z1+.17)],[xUv(xMin),zUv(z1-.17)],
                [xUv(xMax),zUv(z1-.17)],[xUv(xMax),zUv(z1+.17)]],light*1.16);
          }
        }
        z0=z1;
      }
    }
    const geometry=Z(new h0());
    geometry.setAttribute("position",new y0(new Float32Array(positions),3));
    geometry.setAttribute("uv",new y0(new Float32Array(uvs),2));
    geometry.setAttribute("color",new y0(new Float32Array(tints),3));
    geometry.computeVertexNormals();
    const mesh=new pt(geometry,material);
    mesh.name="hellAscentLanternLightSpill";
    scene.add(mesh);
  }

  const decorate=FJ;
  FJ=function(scene,map){
    decorate.apply(this,arguments);
    if(T.level!==0||!map.decor.some(d=>d.k==="returnGallowsBay"&&d.x===56&&d.z===43))return;
    decorateAscent(scene);
    bakeLanternSpill(scene);
  };
})();
/* HELL_ASCENT_LANTERNS_END */
